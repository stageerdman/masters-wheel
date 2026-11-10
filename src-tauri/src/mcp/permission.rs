// Runs inside the mcp_server subprocess (see server.rs) — tells the
// bridge (bridge.rs, running in the main app process) over localhost
// that a gated-looking tool (get_performance_review, get_training_session)
// just actually read a resource's content, same "shell out to curl
// rather than add an HTTP client crate" approach transcribe.rs already
// uses for ElevenLabs.
//
// There's deliberately no access *check* here anymore — every record
// and session is always readable. This module used to block the read
// behind an interactive Decline/Allow/Always Allow prompt the first time
// a resource came up in a chat; the user asked to drop that entirely —
// it only ever guarded against the model reading "irrelevant" records,
// which its own judgment already handles (list_performance_reviews'
// description field, search_performance_reviews), not an interactive
// gate. `mark_read` is the one thing worth keeping from that system: it
// promotes a merely-"suggested" tag (the record/session currently open
// on screen) to "active" the moment it's actually read, so it keeps
// showing as a chip and feeding this chat's context after the user
// navigates away — see bridge.rs's `/mark-used`.
//
// assistant.rs sets these per-call via the generated --mcp-config's env
// (see config.rs) — this subprocess has no other way to know which chat
// session it's answering for.
use crate::mcp::bridge::ResourceKind;

const BRIDGE_PORT_ENV: &str = "MASTERS_WHEEL_BRIDGE_PORT";
const CHAT_SESSION_ID_ENV: &str = "MASTERS_WHEEL_CHAT_SESSION_ID";

// Best-effort and fire-and-forget: a failed call just means the tag
// stays "suggested" instead of promoting to "active" — the read itself
// already succeeded either way, so this is never allowed to block or
// fail the actual tool call.
pub async fn mark_read(resource_kind: ResourceKind, resource_id: &str) {
    let port = std::env::var(BRIDGE_PORT_ENV).unwrap_or_default();
    let session_id = std::env::var(CHAT_SESSION_ID_ENV).unwrap_or_default();
    if port.is_empty() || session_id.is_empty() {
        // No bridge context at all (e.g. a hand test outside the real
        // app) — nothing to mark, nothing to fail.
        return;
    }
    let _ = tokio::process::Command::new("curl")
        .arg("-s")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Content-Type: application/json")
        .arg("--max-time")
        .arg("5")
        .arg("-d")
        .arg(
            serde_json::json!({
                "session_id": session_id,
                "resource_kind": resource_kind.as_str(),
                "resource_id": resource_id,
            })
            .to_string(),
        )
        .arg(format!("http://127.0.0.1:{port}/mark-used"))
        .output()
        .await;
}
