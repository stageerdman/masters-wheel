// Runs inside the mcp_server subprocess (see server.rs) — talks to the
// bridge (bridge.rs, running in the main app process) over localhost to
// decide whether get_performance_review may actually serve a record's
// content, same "shell out to curl rather than add an HTTP client crate"
// approach transcribe.rs already uses for ElevenLabs.
//
// assistant.rs sets these per-call via the generated --mcp-config's env
// (see config.rs) — this subprocess has no other way to know which chat
// session or agent it's answering for.
const BRIDGE_PORT_ENV: &str = "MASTERS_WHEEL_BRIDGE_PORT";
const CHAT_SESSION_ID_ENV: &str = "MASTERS_WHEEL_CHAT_SESSION_ID";
const AGENT_ID_ENV: &str = "MASTERS_WHEEL_AGENT_ID";

pub enum Access {
    Allowed,
    Declined,
}

pub async fn check_access(record_id: &str, document: &str, record_title: &str) -> Result<Access, String> {
    let port = std::env::var(BRIDGE_PORT_ENV).unwrap_or_default();
    let session_id = std::env::var(CHAT_SESSION_ID_ENV).unwrap_or_default();
    let agent_id = std::env::var(AGENT_ID_ENV).unwrap_or_default();
    if port.is_empty() || session_id.is_empty() {
        // No bridge context at all (e.g. a hand test outside the real
        // app) — fail closed rather than silently granting access.
        return Ok(Access::Declined);
    }

    let access = post_json(
        &port,
        "/access",
        &serde_json::json!({ "session_id": session_id, "record_id": record_id }),
    )
    .await?;
    let preauthorized = access.get("preauthorized").and_then(|v| v.as_bool()).unwrap_or(false);
    if preauthorized {
        if access.get("via").and_then(|v| v.as_str()) == Some("tag-suggested") {
            // Best-effort: a failed mark-used just means the tag stays
            // "suggested" instead of promoting to "active" — the read
            // itself already succeeded either way.
            let _ = post_json(
                &port,
                "/mark-used",
                &serde_json::json!({ "session_id": session_id, "record_id": record_id }),
            )
            .await;
        }
        return Ok(Access::Allowed);
    }

    let decision = post_json(
        &port,
        "/permission-request",
        &serde_json::json!({
            "session_id": session_id,
            "agent_id": agent_id,
            "record_id": record_id,
            "record_title": record_title,
            "document": document,
        }),
    )
    .await?;
    match decision.get("decision").and_then(|v| v.as_str()) {
        Some("allow") | Some("always-allow") => Ok(Access::Allowed),
        _ => Ok(Access::Declined),
    }
}

async fn post_json(port: &str, path: &str, body: &serde_json::Value) -> Result<serde_json::Value, String> {
    let output = tokio::process::Command::new("curl")
        .arg("-s")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Content-Type: application/json")
        .arg("--max-time")
        .arg("185")
        .arg("-d")
        .arg(body.to_string())
        .arg(format!("http://127.0.0.1:{port}{path}"))
        .output()
        .await
        .map_err(|e| format!("couldn't reach masters-wheel bridge: {e}"))?;
    serde_json::from_slice(&output.stdout).map_err(|e| format!("bad bridge response from {path}: {e}"))
}
