// The local bridge between live app state (which records are tagged in
// which chat, which the user has always-allowed) and the MCP server
// subprocess, which is spawned fresh per `ask_agent` call and otherwise
// has no way to see that state at all. Same `tiny_http` pattern as
// media_server.rs (fixed localhost port, worker threads) — a second,
// unrelated local server rather than reusing that one, since this one is
// a small internal JSON API, not a file/range server.
//
// Three endpoints, all POST+JSON, called only by mcp/permission.rs from
// the mcp_server subprocess (never by the model, never reachable from
// outside this machine):
//   POST /access              -> is this record already in scope?
//   POST /mark-used            -> a "suggested" tag just got read for real
//   POST /permission-request   -> ask the real user; blocks until they
//                                 answer (or times out)
//
// Two Tauri commands at the bottom let the frontend push tag state in
// and resolve a pending permission request.

use std::collections::{HashMap, HashSet};
use std::net::Ipv4Addr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Request, Response, Server};

pub const PORT: u16 = 47822;
const WORKER_THREADS: usize = 4;
// How long a tool call waits on the real user before giving up and
// answering "decline" on their behalf — long enough that a user who's
// just stepped away doesn't get a false decline the moment they return,
// short enough that a closed/abandoned assistant window can't hang a
// `claude -p` call forever.
const PERMISSION_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TagKind {
    Suggested,
    Active,
}

#[derive(Default)]
struct SessionAccess {
    tags: HashMap<String, TagKind>,
    always_allowed: HashSet<String>,
}

impl SessionAccess {
    // The actual gating decision: a tag (either kind) or an always-allow
    // grant both pre-authorize silently; a tag wins over always-allow
    // when a record somehow has both, since "via" drives whether
    // mark-used fires (see mcp/permission.rs — only ever for
    // "tag-suggested", never for "always-allowed"). Pure and
    // dependency-free on purpose — see the tests below.
    fn resolve(&self, record_id: &str) -> AccessResult {
        if let Some(kind) = self.tags.get(record_id) {
            AccessResult {
                preauthorized: true,
                via: Some(match kind {
                    TagKind::Suggested => "tag-suggested",
                    TagKind::Active => "tag-active",
                }),
            }
        } else if self.always_allowed.contains(record_id) {
            AccessResult { preauthorized: true, via: Some("always-allowed") }
        } else {
            AccessResult { preauthorized: false, via: None }
        }
    }
}

struct PendingRequest {
    sender: mpsc::Sender<String>,
    session_id: String,
    record_id: String,
}

#[derive(Default)]
struct BridgeState {
    sessions: Mutex<HashMap<String, SessionAccess>>,
    pending: Mutex<HashMap<String, PendingRequest>>,
}

static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Clone)]
pub struct Bridge {
    state: Arc<BridgeState>,
}

impl Bridge {
    pub fn sync_tags(&self, session_id: String, tags: Vec<(String, TagKind)>, always_allowed: Vec<String>) {
        let mut sessions = self.state.sessions.lock().expect("bridge sessions mutex");
        let entry = sessions.entry(session_id).or_default();
        entry.tags = tags.into_iter().collect();
        entry.always_allowed = always_allowed.into_iter().collect();
    }

    // Every record currently tagged for a session (both kinds — a
    // "suggested" tag is just as much "in view" as an "active" one from
    // the model's perspective) — assistant.rs weaves this into the
    // system prompt per turn (see knowledge::prompt), since a tag on
    // its own is invisible to the model otherwise: it only ever
    // gates/pre-authorizes a tool call, it was never actually mentioned
    // in anything the model reads. Called in-process (same Tauri app,
    // via `tauri::State<Bridge>`), not over HTTP like the mcp_server
    // subprocess's own calls — assistant.rs already has direct access.
    pub fn tags_for_session(&self, session_id: &str) -> Vec<(String, TagKind)> {
        let sessions = self.state.sessions.lock().expect("bridge sessions mutex");
        sessions
            .get(session_id)
            .map(|access| access.tags.iter().map(|(id, kind)| (id.clone(), *kind)).collect())
            .unwrap_or_default()
    }

    // Resolves a pending permission-request (no-op if it already timed
    // out or was answered) — the only place `always_allowed` grows
    // outside of `sync_tags`, so the grant is live in the bridge
    // immediately rather than waiting on the frontend's next sync.
    pub fn respond(&self, request_id: &str, decision: &str) {
        let pending = {
            let mut pending = self.state.pending.lock().expect("bridge pending mutex");
            pending.remove(request_id)
        };
        let Some(pending) = pending else { return };
        if decision == "always-allow" {
            let mut sessions = self.state.sessions.lock().expect("bridge sessions mutex");
            sessions
                .entry(pending.session_id.clone())
                .or_default()
                .always_allowed
                .insert(pending.record_id.clone());
        }
        let _ = pending.sender.send(decision.to_string());
    }
}

pub fn spawn(app: AppHandle) -> Bridge {
    let state = Arc::new(BridgeState::default());
    let bridge = Bridge { state: state.clone() };

    let server = match Server::http((Ipv4Addr::LOCALHOST, PORT)) {
        Ok(server) => Arc::new(server),
        Err(e) => {
            eprintln!("mcp bridge: failed to bind 127.0.0.1:{PORT}: {e}");
            return bridge;
        }
    };

    for _ in 0..WORKER_THREADS {
        let server = Arc::clone(&server);
        let state = Arc::clone(&state);
        let app = app.clone();
        std::thread::spawn(move || {
            while let Ok(request) = server.recv() {
                handle(request, &state, &app);
            }
        });
    }

    bridge
}

fn handle(mut request: Request, state: &Arc<BridgeState>, app: &AppHandle) {
    if *request.method() != Method::Post {
        let _ = request.respond(Response::empty(404));
        return;
    }
    let mut body = String::new();
    if request.as_reader().read_to_string(&mut body).is_err() {
        let _ = request.respond(Response::empty(400));
        return;
    }
    match request.url() {
        "/access" => handle_access(request, state, &body),
        "/mark-used" => handle_mark_used(request, app, &body),
        "/permission-request" => handle_permission_request(request, state, app, &body),
        _ => {
            let _ = request.respond(Response::empty(404));
        }
    }
}

fn respond_json<T: Serialize>(request: Request, value: &T) {
    let body = serde_json::to_vec(value).unwrap_or_default();
    let header = Header::from_bytes("Content-Type", "application/json").expect("static header");
    let _ = request.respond(Response::from_data(body).with_header(header));
}

#[derive(Deserialize)]
struct AccessQuery {
    session_id: String,
    record_id: String,
}

#[derive(Debug, PartialEq, Serialize)]
struct AccessResult {
    preauthorized: bool,
    via: Option<&'static str>,
}

fn handle_access(request: Request, state: &Arc<BridgeState>, body: &str) {
    let Ok(query) = serde_json::from_str::<AccessQuery>(body) else {
        let _ = request.respond(Response::empty(400));
        return;
    };
    let sessions = state.sessions.lock().expect("bridge sessions mutex");
    let result = sessions
        .get(&query.session_id)
        .map(|access| access.resolve(&query.record_id))
        .unwrap_or(AccessResult { preauthorized: false, via: None });
    drop(sessions);
    respond_json(request, &result);
}

#[derive(Deserialize)]
struct MarkUsedBody {
    session_id: String,
    record_id: String,
}

fn handle_mark_used(request: Request, app: &AppHandle, body: &str) {
    let Ok(payload) = serde_json::from_str::<MarkUsedBody>(body) else {
        let _ = request.respond(Response::empty(400));
        return;
    };
    let _ = app.emit(
        "mcp-tag-used",
        serde_json::json!({ "sessionId": payload.session_id, "recordId": payload.record_id }),
    );
    let _ = request.respond(Response::empty(200));
}

#[derive(Deserialize)]
struct PermissionRequestBody {
    session_id: String,
    agent_id: String,
    record_id: String,
    record_title: String,
    document: String,
}

#[derive(Serialize)]
struct PermissionDecisionResult {
    decision: String,
}

fn handle_permission_request(request: Request, state: &Arc<BridgeState>, app: &AppHandle, body: &str) {
    let Ok(payload) = serde_json::from_str::<PermissionRequestBody>(body) else {
        let _ = request.respond(Response::empty(400));
        return;
    };

    let request_id = format!("{}-{}", std::process::id(), REQUEST_COUNTER.fetch_add(1, Ordering::SeqCst));
    let (sender, receiver) = mpsc::channel::<String>();
    state.pending.lock().expect("bridge pending mutex").insert(
        request_id.clone(),
        PendingRequest {
            sender,
            session_id: payload.session_id.clone(),
            record_id: payload.record_id.clone(),
        },
    );

    let _ = app.emit(
        "mcp-permission-request",
        serde_json::json!({
            "requestId": request_id,
            "sessionId": payload.session_id,
            "agentId": payload.agent_id,
            "recordId": payload.record_id,
            "recordTitle": payload.record_title,
            "document": payload.document,
        }),
    );

    let decision = match receiver.recv_timeout(PERMISSION_TIMEOUT) {
        Ok(decision) => decision,
        Err(_) => {
            state.pending.lock().expect("bridge pending mutex").remove(&request_id);
            "decline".to_string()
        }
    };
    respond_json(request, &PermissionDecisionResult { decision });
}

// camelCase to match what the frontend actually sends (see
// src/lib/mcp/bridge.ts) — Tauri's own arg-name case conversion only
// covers a command's top-level parameter names, not a nested struct's
// own fields, which still go through plain serde field matching.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub record_id: String,
    pub kind: TagKind,
}

#[tauri::command]
pub fn sync_mcp_tags(bridge: tauri::State<Bridge>, session_id: String, tags: Vec<TagDto>, always_allowed: Vec<String>) {
    bridge.sync_tags(session_id, tags.into_iter().map(|tag| (tag.record_id, tag.kind)).collect(), always_allowed);
}

#[tauri::command]
pub fn respond_to_mcp_permission(bridge: tauri::State<Bridge>, request_id: String, decision: String) {
    bridge.respond(&request_id, &decision);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn access_with(tags: &[(&str, TagKind)], always_allowed: &[&str]) -> SessionAccess {
        SessionAccess {
            tags: tags.iter().map(|(id, kind)| (id.to_string(), *kind)).collect(),
            always_allowed: always_allowed.iter().map(|id| id.to_string()).collect(),
        }
    }

    #[test]
    fn untagged_and_unallowed_record_is_not_preauthorized() {
        let access = access_with(&[], &[]);
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: false, via: None });
    }

    #[test]
    fn suggested_tag_preauthorizes_and_reports_suggested() {
        let access = access_with(&[("r1", TagKind::Suggested)], &[]);
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: true, via: Some("tag-suggested") });
    }

    #[test]
    fn active_tag_preauthorizes_and_reports_active() {
        let access = access_with(&[("r1", TagKind::Active)], &[]);
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: true, via: Some("tag-active") });
    }

    #[test]
    fn always_allowed_preauthorizes_a_record_with_no_tag_at_all() {
        let access = access_with(&[], &["r1"]);
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: true, via: Some("always-allowed") });
    }

    #[test]
    fn a_tag_is_checked_before_always_allow() {
        // Shouldn't come up in practice (promoteTag/sync keep these
        // disjoint in the frontend), but the gating decision should stay
        // deterministic either way rather than depending on map
        // iteration order.
        let access = access_with(&[("r1", TagKind::Suggested)], &["r1"]);
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: true, via: Some("tag-suggested") });
    }

    #[test]
    fn a_tag_or_grant_on_one_record_never_leaks_to_another() {
        let access = access_with(&[("r1", TagKind::Active)], &["r2"]);
        assert_eq!(access.resolve("r3"), AccessResult { preauthorized: false, via: None });
    }

    #[test]
    fn unknown_session_is_never_preauthorized() {
        let sessions: HashMap<String, SessionAccess> = HashMap::new();
        let result = sessions.get("missing").map(|access| access.resolve("r1")).unwrap_or(AccessResult {
            preauthorized: false,
            via: None,
        });
        assert_eq!(result, AccessResult { preauthorized: false, via: None });
    }

    #[test]
    fn respond_with_always_allow_grants_access_for_future_calls_in_that_session() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state: state.clone() };
        let (sender, _receiver) = mpsc::channel::<String>();
        state.pending.lock().unwrap().insert(
            "req-1".to_string(),
            PendingRequest { sender, session_id: "s1".to_string(), record_id: "r1".to_string() },
        );

        bridge.respond("req-1", "always-allow");

        let sessions = state.sessions.lock().unwrap();
        let access = sessions.get("s1").expect("session should exist after a grant");
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: true, via: Some("always-allowed") });
    }

    #[test]
    fn respond_with_decline_never_grants_always_allow() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state: state.clone() };
        let (sender, _receiver) = mpsc::channel::<String>();
        state.pending.lock().unwrap().insert(
            "req-1".to_string(),
            PendingRequest { sender, session_id: "s1".to_string(), record_id: "r1".to_string() },
        );

        bridge.respond("req-1", "decline");

        let sessions = state.sessions.lock().unwrap();
        assert!(sessions.get("s1").is_none(), "no SessionAccess should be created for a plain decline");
    }

    #[test]
    fn sync_tags_replaces_rather_than_merges_with_the_previous_sync() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state: state.clone() };
        bridge.sync_tags("s1".to_string(), vec![("r1".to_string(), TagKind::Suggested)], vec![]);
        bridge.sync_tags("s1".to_string(), vec![("r2".to_string(), TagKind::Active)], vec![]);

        let sessions = state.sessions.lock().unwrap();
        let access = sessions.get("s1").unwrap();
        assert_eq!(access.resolve("r1"), AccessResult { preauthorized: false, via: None });
        assert_eq!(access.resolve("r2"), AccessResult { preauthorized: true, via: Some("tag-active") });
    }
}
