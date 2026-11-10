// The local bridge between live app state (which resources — Performance
// Review records, and (generalized) Training Room sessions — are tagged
// in which chat) and the MCP server subprocess, which is spawned fresh
// per `ask_agent` call and otherwise has no way to see that state at
// all. Same `tiny_http` pattern as media_server.rs (fixed localhost
// port, worker threads) — a second, unrelated local server rather than
// reusing that one, since this one is a small internal JSON API, not a
// file/range server.
//
// Resource access itself is never gated — every record and session is
// freely readable at any time (the per-record Decline/Allow/Always Allow
// dance was removed by user request: it only ever guarded against
// reading "irrelevant" records, which the model's own judgment already
// handles via list_performance_reviews' description field and
// search_performance_reviews, not an interactive prompt). What's left
// here is purely about *context*, not permission: which resource is
// "tagged" (in view, or already discussed) for a chat, so assistant.rs
// can weave that into the system prompt (see knowledge::prompt) and the
// frontend can show it as a chip.
//
// One endpoint, POST+JSON, called only by mcp/permission.rs from the
// mcp_server subprocess (never by the model, never reachable from
// outside this machine):
//   POST /mark-used   -> a "suggested" tag just got read for real,
//                         promote it to "active" so it sticks.
//
// One Tauri command at the bottom lets the frontend push tag state in.

use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::sync::{Arc, Mutex};

use serde::de::{self, Deserializer};
use serde::ser::Serializer;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tiny_http::{Method, Request, Response, Server};

pub const PORT: u16 = 47822;
const WORKER_THREADS: usize = 4;

// What kind of resource a tag is about — originally Performance-Review-
// only (a bare record id); generalized once Training Room sessions
// became a second real taggable resource kind. Serializes to/from
// exactly the same string the frontend's TaggedResourceKind union uses
// ("performanceReview"/"trainingSession"), everywhere this type appears
// (Tauri command args and emitted events alike) — one canonical
// representation, not a different casing per hop.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ResourceKind {
    PerformanceReview,
    TrainingSession,
}

impl ResourceKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ResourceKind::PerformanceReview => "performanceReview",
            ResourceKind::TrainingSession => "trainingSession",
        }
    }
}

impl std::str::FromStr for ResourceKind {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "performanceReview" => Ok(ResourceKind::PerformanceReview),
            "trainingSession" => Ok(ResourceKind::TrainingSession),
            other => Err(format!("unknown resource kind: {other}")),
        }
    }
}

impl Serialize for ResourceKind {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for ResourceKind {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        value.parse().map_err(de::Error::custom)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TagKind {
    Suggested,
    Active,
}

type ResourceId = (ResourceKind, String);

#[derive(Default)]
struct SessionTags {
    tags: HashMap<ResourceId, TagKind>,
}

#[derive(Default)]
struct BridgeState {
    sessions: Mutex<HashMap<String, SessionTags>>,
}

#[derive(Clone)]
pub struct Bridge {
    state: Arc<BridgeState>,
}

impl Bridge {
    pub fn sync_tags(&self, session_id: String, tags: Vec<(ResourceKind, String, TagKind)>) {
        let mut sessions = self.state.sessions.lock().expect("bridge sessions mutex");
        let entry = sessions.entry(session_id).or_default();
        entry.tags = tags.into_iter().map(|(kind, id, state)| ((kind, id), state)).collect();
    }

    // Every resource currently tagged for a session (both kinds — a
    // "suggested" tag is just as much "in view" as an "active" one from
    // the model's perspective) — assistant.rs weaves this into the
    // system prompt per turn (see knowledge::prompt), since a tag on
    // its own is invisible to the model otherwise. Called in-process
    // (same Tauri app, via `tauri::State<Bridge>`), not over HTTP like
    // the mcp_server subprocess's own calls — assistant.rs already has
    // direct access.
    pub fn tags_for_session(&self, session_id: &str) -> Vec<(ResourceKind, String, TagKind)> {
        let sessions = self.state.sessions.lock().expect("bridge sessions mutex");
        sessions
            .get(session_id)
            .map(|access| access.tags.iter().map(|((kind, id), state)| (*kind, id.clone(), *state)).collect())
            .unwrap_or_default()
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
        let app = app.clone();
        std::thread::spawn(move || {
            while let Ok(request) = server.recv() {
                handle(request, &app);
            }
        });
    }

    bridge
}

fn handle(mut request: Request, app: &AppHandle) {
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
        "/mark-used" => handle_mark_used(request, app, &body),
        _ => {
            let _ = request.respond(Response::empty(404));
        }
    }
}

#[derive(Deserialize)]
struct MarkUsedBody {
    session_id: String,
    resource_kind: ResourceKind,
    resource_id: String,
}

fn handle_mark_used(request: Request, app: &AppHandle, body: &str) {
    let Ok(payload) = serde_json::from_str::<MarkUsedBody>(body) else {
        let _ = request.respond(Response::empty(400));
        return;
    };
    let _ = app.emit(
        "mcp-tag-used",
        serde_json::json!({
            "sessionId": payload.session_id,
            "resourceKind": payload.resource_kind.as_str(),
            "resourceId": payload.resource_id,
        }),
    );
    let _ = request.respond(Response::empty(200));
}

// camelCase to match what the frontend actually sends (see
// src/lib/mcp/bridge.ts) — Tauri's own arg-name case conversion only
// covers a command's top-level parameter names, not a nested struct's
// own fields, which still go through plain serde field matching.
// `resource_kind`'s own (de)serialization is unaffected by this
// attribute either way — ResourceKind implements it manually above.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub resource_kind: ResourceKind,
    pub resource_id: String,
    pub state: TagKind,
}

#[tauri::command]
pub fn sync_mcp_tags(bridge: tauri::State<Bridge>, session_id: String, tags: Vec<TagDto>) {
    bridge.sync_tags(session_id, tags.into_iter().map(|tag| (tag.resource_kind, tag.resource_id, tag.state)).collect());
}

#[cfg(test)]
mod tests {
    use super::*;

    const PR: ResourceKind = ResourceKind::PerformanceReview;
    const TS: ResourceKind = ResourceKind::TrainingSession;

    #[test]
    fn unknown_session_has_no_tags() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state };
        assert_eq!(bridge.tags_for_session("missing"), vec![]);
    }

    #[test]
    fn sync_tags_is_readable_back_for_that_session() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state };
        bridge.sync_tags("s1".to_string(), vec![(PR, "r1".to_string(), TagKind::Suggested)]);
        assert_eq!(bridge.tags_for_session("s1"), vec![(PR, "r1".to_string(), TagKind::Suggested)]);
    }

    #[test]
    fn sync_tags_replaces_rather_than_merges_with_the_previous_sync() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state };
        bridge.sync_tags("s1".to_string(), vec![(PR, "r1".to_string(), TagKind::Suggested)]);
        bridge.sync_tags("s1".to_string(), vec![(TS, "t1".to_string(), TagKind::Active)]);
        assert_eq!(bridge.tags_for_session("s1"), vec![(TS, "t1".to_string(), TagKind::Active)]);
    }

    #[test]
    fn tags_never_leak_across_sessions() {
        let state = Arc::new(BridgeState::default());
        let bridge = Bridge { state };
        bridge.sync_tags("s1".to_string(), vec![(PR, "r1".to_string(), TagKind::Active)]);
        assert_eq!(bridge.tags_for_session("s2"), vec![]);
    }

    #[test]
    fn resource_kind_round_trips_through_its_canonical_string() {
        assert_eq!(ResourceKind::PerformanceReview.as_str(), "performanceReview");
        assert_eq!(ResourceKind::TrainingSession.as_str(), "trainingSession");
        assert_eq!("performanceReview".parse::<ResourceKind>().unwrap(), ResourceKind::PerformanceReview);
        assert_eq!("trainingSession".parse::<ResourceKind>().unwrap(), ResourceKind::TrainingSession);
        assert!("something-else".parse::<ResourceKind>().is_err());
    }
}
