// The signed-in OneDrive account for this app: runs the sign-in, keeps the
// short-lived access token in memory, refreshes it from the Keychain's
// refresh token when it runs out, and signs out. Managed as Tauri state.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use super::auth::{self, TokenSet};
use super::curl::{self, HttpRequest};
use super::error::OneDriveError;
use super::graph;
use super::loopback::Loopback;
use super::pkce;
use super::token_store::{self, StoredAccount};

const SIGN_IN_TIMEOUT: Duration = Duration::from_secs(5 * 60);
// Refresh a minute early so a token never expires mid-request.
const EXPIRY_MARGIN: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub connected: bool,
    pub account: Option<String>,
}

struct AccessToken {
    token: String,
    expires_at: Instant,
}

#[derive(Default)]
struct State {
    // `None` until the Keychain has been read once; each read can cost a
    // Keychain prompt on an unsigned build, so it's cached.
    account: Option<Option<StoredAccount>>,
    access: Option<AccessToken>,
}

#[derive(Default)]
pub struct OneDriveSession {
    state: Mutex<State>,
    pending_sign_in: Mutex<Option<Arc<AtomicBool>>>,
}

fn client_id() -> String {
    std::env::var("ONEDRIVE_CLIENT_ID")
        .ok()
        .map(|id| id.trim().to_string())
        .filter(|id| !id.is_empty())
        .unwrap_or_else(|| auth::CLIENT_ID.to_string())
}

impl OneDriveSession {
    pub fn status(&self) -> Result<Status, OneDriveError> {
        let mut state = self.lock();
        let account = cached_account(&mut state)?;
        Ok(Status { connected: account.is_some(), account: account.map(|a| a.name) })
    }

    // Opens the browser on Microsoft's sign-in page via `open_url` and
    // blocks until the redirect comes back (or times out / is cancelled).
    pub fn sign_in(&self, open_url: impl Fn(&str) -> Result<(), OneDriveError>) -> Result<Status, OneDriveError> {
        let client_id = client_id();
        let cancelled = self.start_pending_sign_in();
        let trace = pkce::random_token(4)?;
        log::info!(target: "onedrive", "[{trace}] sign_in: started");

        let result = self.run_sign_in(&client_id, &cancelled, open_url);
        match &result {
            Ok(_) => log::info!(target: "onedrive", "[{trace}] sign_in: connected"),
            Err(e) => log::warn!(target: "onedrive", "[{trace}] sign_in: {e}"),
        }
        result?;
        self.status()
    }

    pub fn cancel_sign_in(&self) {
        if let Some(flag) = self.pending_sign_in.lock().expect("sign-in flag mutex poisoned").take() {
            flag.store(true, Ordering::SeqCst);
        }
    }

    pub fn sign_out(&self) -> Result<Status, OneDriveError> {
        self.cancel_sign_in();
        token_store::clear().map_err(|e| e.context("sign_out"))?;
        *self.lock() = State { account: Some(None), access: None };
        log::info!(target: "onedrive", "sign_out: done");
        self.status()
    }

    // A valid access token, refreshing it if needed. Never leaves Rust.
    pub fn access_token(&self) -> Result<String, OneDriveError> {
        let mut state = self.lock();
        if let Some(access) = &state.access {
            if access.expires_at > Instant::now() + EXPIRY_MARGIN {
                return Ok(access.token.clone());
            }
        }
        let account = cached_account(&mut state)?.ok_or(OneDriveError::NotConnected)?;
        let tokens = match request_tokens(&auth::refresh_form(&client_id(),&account.refresh_token)) {
            Err(OneDriveError::SignInExpired) => {
                // The refresh token is dead; keeping it would fail forever.
                token_store::clear()?;
                *state = State { account: Some(None), access: None };
                return Err(OneDriveError::SignInExpired);
            }
            other => other.map_err(|e| e.context("refreshing the sign-in"))?,
        };
        if let Some(rotated) = &tokens.refresh_token {
            let updated = StoredAccount { refresh_token: rotated.clone(), name: account.name };
            token_store::save(&updated)?;
            state.account = Some(Some(updated));
        }
        Ok(remember_access(&mut state, &tokens))
    }

    fn run_sign_in(
        &self,
        client_id: &str,
        cancelled: &AtomicBool,
        open_url: impl Fn(&str) -> Result<(), OneDriveError>,
    ) -> Result<(), OneDriveError> {
        let pkce = pkce::new_pkce()?;
        let expected_state = pkce::random_token(16)?;
        let loopback = Loopback::bind()?;
        let redirect_uri = loopback.redirect_uri();

        open_url(&auth::authorize_url(client_id, &redirect_uri, &pkce.challenge, &expected_state))?;
        let redirect = loopback.wait_for_redirect(SIGN_IN_TIMEOUT, cancelled)?;
        let code = auth::code_from_redirect(&redirect, &expected_state)?;

        let form = auth::code_exchange_form(client_id, &code, &redirect_uri, &pkce.verifier);
        let tokens = request_tokens(&form).map_err(|e| e.context("exchanging the sign-in code"))?;
        let refresh_token = tokens
            .refresh_token
            .clone()
            .ok_or_else(|| OneDriveError::Auth("Microsoft sent no refresh token".into()))?;
        let account = graph::me(&tokens.access_token).map_err(|e| e.context("reading the account"))?;

        let stored = StoredAccount { refresh_token, name: account.name };
        token_store::save(&stored)?;
        let mut state = self.lock();
        state.account = Some(Some(stored));
        remember_access(&mut state, &tokens);
        Ok(())
    }

    // A new Connect click supersedes one still waiting in the browser.
    fn start_pending_sign_in(&self) -> Arc<AtomicBool> {
        self.cancel_sign_in();
        let flag = Arc::new(AtomicBool::new(false));
        *self.pending_sign_in.lock().expect("sign-in flag mutex poisoned") = Some(Arc::clone(&flag));
        flag
    }

    fn lock(&self) -> MutexGuard<'_, State> {
        self.state.lock().expect("OneDrive state mutex poisoned")
    }
}

fn cached_account(state: &mut State) -> Result<Option<StoredAccount>, OneDriveError> {
    if state.account.is_none() {
        state.account = Some(token_store::load()?);
    }
    Ok(state.account.clone().flatten())
}

fn remember_access(state: &mut State, tokens: &TokenSet) -> String {
    let expires_at = Instant::now() + Duration::from_secs(tokens.expires_in_seconds);
    state.access = Some(AccessToken { token: tokens.access_token.clone(), expires_at });
    tokens.access_token.clone()
}

fn request_tokens(form: &str) -> Result<TokenSet, OneDriveError> {
    let response = curl::send(&HttpRequest {
        method: "POST",
        url: &auth::token_endpoint(),
        headers: vec!["Content-Type: application/x-www-form-urlencoded".into()],
        body: Some(form),
        ..Default::default()
    })?;
    auth::parse_token_response(&response.body)
}
