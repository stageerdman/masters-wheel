// The pure half of Microsoft's OAuth 2.0 auth-code + PKCE flow: building
// the authorize URL and token-request forms, and reading what comes back.
// No I/O here, so all of it is unit-tested.

use std::collections::HashMap;

use url::Url;
use url::form_urlencoded::Serializer;

use super::error::OneDriveError;

// `common` accepts both personal Microsoft accounts and work/school ones.
pub const AUTHORITY: &str = "https://login.microsoftonline.com/common/oauth2/v2.0";
// Least privilege: only the app's own folder, plus the account's name for
// the Settings panel, plus a refresh token so the user signs in once.
pub const SCOPES: &str = "Files.ReadWrite.AppFolder User.Read offline_access";

pub fn token_endpoint() -> String {
    format!("{AUTHORITY}/token")
}

pub fn authorize_url(client_id: &str, redirect_uri: &str, challenge: &str, state: &str) -> String {
    let mut url = Url::parse(&format!("{AUTHORITY}/authorize")).expect("static authorize URL is valid");
    url.query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("response_mode", "query")
        .append_pair("scope", SCOPES)
        .append_pair("code_challenge", challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", state)
        .append_pair("prompt", "select_account");
    url.into()
}

// `path_and_query` is what the loopback listener received, e.g.
// "/?code=...&state=...". Checks `state` so a stray local request can't
// inject a code.
pub fn code_from_redirect(path_and_query: &str, expected_state: &str) -> Result<String, OneDriveError> {
    let url = Url::parse(&format!("http://localhost{path_and_query}"))
        .map_err(|e| OneDriveError::Auth(format!("unreadable redirect: {e}")))?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    if let Some(error) = params.get("error") {
        if error == "access_denied" {
            return Err(OneDriveError::SignInCancelled);
        }
        let description = params.get("error_description").unwrap_or(error);
        return Err(OneDriveError::from_microsoft(description));
    }
    if params.get("state").map(String::as_str) != Some(expected_state) {
        return Err(OneDriveError::Auth("the sign-in response didn't match this request".into()));
    }
    params
        .get("code")
        .filter(|code| !code.is_empty())
        .cloned()
        .ok_or_else(|| OneDriveError::Auth("no authorization code came back".into()))
}

pub fn code_exchange_form(client_id: &str, code: &str, redirect_uri: &str, verifier: &str) -> String {
    Serializer::new(String::new())
        .append_pair("client_id", client_id)
        .append_pair("grant_type", "authorization_code")
        .append_pair("code", code)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("code_verifier", verifier)
        .append_pair("scope", SCOPES)
        .finish()
}

pub fn refresh_form(client_id: &str, refresh_token: &str) -> String {
    Serializer::new(String::new())
        .append_pair("client_id", client_id)
        .append_pair("grant_type", "refresh_token")
        .append_pair("refresh_token", refresh_token)
        .append_pair("scope", SCOPES)
        .finish()
}

#[derive(Debug, PartialEq)]
pub struct TokenSet {
    pub access_token: String,
    // Microsoft usually rotates it on every refresh; `None` means keep the
    // one we have.
    pub refresh_token: Option<String>,
    pub expires_in_seconds: u64,
}

pub fn parse_token_response(body: &str) -> Result<TokenSet, OneDriveError> {
    let value: serde_json::Value =
        serde_json::from_str(body).map_err(|e| OneDriveError::Auth(format!("unexpected token response: {e}")))?;
    if let Some(error) = value.get("error").and_then(|e| e.as_str()) {
        if error == "invalid_grant" {
            return Err(OneDriveError::SignInExpired);
        }
        let description = value.get("error_description").and_then(|d| d.as_str()).unwrap_or(error);
        // Microsoft appends trace/correlation ids on new lines; the first
        // line is the readable part.
        let first_line = description.lines().next().unwrap_or(error);
        return Err(OneDriveError::from_microsoft(first_line));
    }
    let access_token = value
        .get("access_token")
        .and_then(|t| t.as_str())
        .filter(|t| !t.is_empty())
        .ok_or_else(|| OneDriveError::Auth("no access token in the response".into()))?;
    Ok(TokenSet {
        access_token: access_token.to_string(),
        refresh_token: value.get("refresh_token").and_then(|t| t.as_str()).map(str::to_string),
        expires_in_seconds: value.get("expires_in").and_then(|e| e.as_u64()).unwrap_or(3600),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authorize_url_carries_pkce_state_and_scopes() {
        let url = Url::parse(&authorize_url("cid", "http://localhost:5123", "chal", "st8")).unwrap();
        let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
        assert_eq!(url.path(), "/common/oauth2/v2.0/authorize");
        assert_eq!(params["client_id"], "cid");
        assert_eq!(params["redirect_uri"], "http://localhost:5123");
        assert_eq!(params["code_challenge"], "chal");
        assert_eq!(params["code_challenge_method"], "S256");
        assert_eq!(params["state"], "st8");
        assert_eq!(params["scope"], SCOPES);
    }

    #[test]
    fn redirect_yields_code_only_when_state_matches() {
        assert_eq!(code_from_redirect("/?code=abc&state=s1", "s1").unwrap(), "abc");
        assert!(matches!(code_from_redirect("/?code=abc&state=other", "s1"), Err(OneDriveError::Auth(_))));
        assert!(matches!(code_from_redirect("/?state=s1", "s1"), Err(OneDriveError::Auth(_))));
    }

    #[test]
    fn redirect_errors_are_reported() {
        assert_eq!(
            code_from_redirect("/?error=access_denied&state=s1", "s1"),
            Err(OneDriveError::SignInCancelled)
        );
        assert_eq!(
            code_from_redirect("/?error=server_error&error_description=Down%20for%20now", "s1"),
            Err(OneDriveError::Auth("Down for now".into()))
        );
        let blocked = code_from_redirect("/?error=consent_required&error_description=AADSTS65001%3A%20needs%20admin", "s1");
        assert_eq!(blocked.map_err(|e| e.kind()), Err("orgBlocked"));
    }

    #[test]
    fn token_forms_are_url_encoded() {
        let form = code_exchange_form("cid", "a+b/c", "http://localhost:1", "v");
        assert!(form.contains("code=a%2Bb%2Fc"));
        assert!(form.contains("grant_type=authorization_code"));
        assert!(form.contains("code_verifier=v"));
        assert!(refresh_form("cid", "r t").contains("refresh_token=r+t"));
    }

    #[test]
    fn token_response_parses_success_and_errors() {
        let ok = parse_token_response(r#"{"access_token":"at","refresh_token":"rt","expires_in":3599}"#).unwrap();
        assert_eq!(
            ok,
            TokenSet { access_token: "at".into(), refresh_token: Some("rt".into()), expires_in_seconds: 3599 }
        );
        assert_eq!(parse_token_response(r#"{"error":"invalid_grant"}"#), Err(OneDriveError::SignInExpired));
        assert_eq!(
            parse_token_response(r#"{"error":"invalid_client","error_description":"AADSTS700016: no app\r\nTrace ID: x"}"#),
            Err(OneDriveError::Auth("AADSTS700016: no app".into()))
        );
        assert!(parse_token_response("<html>").is_err());
    }
}
