// Shared primitive for a one-shot (non-streaming, no MCP tools, no chat
// session) local `claude` CLI call. `assistant.rs`'s `ask_agent` is a
// different, heavier path (streaming, MCP-gated, a user-facing Agent
// persona) — this is for internal "run claude once, get text back" needs.
// Originally lived only in `roleplay.rs`; extracted here once scorecard
// generation became a second real consumer.
//
// Replies are plain labeled lines, not JSON content — see roleplay.rs's
// module doc for the empirical reasoning behind that choice. This module
// only owns the CLI invocation itself; every caller does its own parsing
// of the returned text.

use std::env::temp_dir;
use std::process::{Command, Stdio};

use crate::util::resolve_binary;

// Runs one blocking `claude -p --output-format json` call and returns its
// `result` text + the CLI's own session id (for a later `--resume`).
pub(crate) fn run_claude(
    system_prompt: &str,
    message: &str,
    resume_session_id: Option<&str>,
) -> Result<(String, String), String> {
    let binary = resolve_binary("claude");
    let mut command = Command::new(&binary);
    command
        .current_dir(temp_dir())
        .arg("-p")
        .arg(message)
        .arg("--output-format")
        .arg("json")
        .arg("--system-prompt")
        .arg(system_prompt)
        .arg("--permission-mode")
        .arg("dontAsk")
        .arg("--tools")
        .arg("")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(id) = resume_session_id.filter(|id| !id.is_empty()) {
        command.arg("--resume").arg(id);
    }

    let output = command
        .output()
        .map_err(|e| format!("The Claude Code CLI isn't available ({e}). Make sure `claude` is installed and you're logged in."))?;

    if !output.status.success() {
        let stderr_text = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr_text.is_empty() { "Claude didn't return a reply.".to_string() } else { stderr_text });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let event: serde_json::Value =
        serde_json::from_str(stdout.trim()).map_err(|e| format!("Couldn't parse reply: {e}"))?;
    let is_error = event.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false);
    let result = event.get("result").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let session_id = event.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();

    if is_error || result.is_empty() {
        return Err("Claude didn't return a reply.".to_string());
    }
    Ok((result, session_id))
}

// Thin command for a caller that just wants one reply with no follow-up
// turn (e.g. scorecard generation) — discards the session id since
// there's nothing to `--resume` into.
#[tauri::command]
pub async fn run_claude_once(system_prompt: String, message: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let (result, _session_id) = run_claude(&system_prompt, &message, None)?;
        Ok(result)
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}
