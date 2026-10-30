// Real AI replies for the AIAssistant chat — prototype slice of the
// "AGENTS-ENGINE" research (see updates/2026-10-30 AGENTS-ENGINE - OPEN).
//
// Deliberately NOT the Anthropic API: the user wants their own already-
// authenticated local Claude Code CLI as the engine, not a pay-per-token
// key. So this shells out to `claude -p` headlessly, the same "shell out
// to an external CLI" shape transcribe.rs already uses for ffmpeg/curl.
//
// Claude Code discovers CLAUDE.md by walking up from the process's working
// directory — left at this project's own repo root, every reply would come
// back answering as if it knew masters-wheel's own coding conventions, which
// has nothing to do with being a chat persona for the person using the app.
// `--bare` looked like the fix (it's documented to skip CLAUDE.md/hooks/
// plugins/MCP/memory) but empirically breaks auth in this environment
// ("Not logged in" even when a normal `claude -p` call works) — verified by
// hand before relying on it. Running the subprocess from `std::env::temp_dir()`
// instead sidesteps the whole problem: cwd-walk-up never reaches this repo's
// CLAUDE.md, auth keeps working normally, and nothing else Claude Code
// would normally offer (the user's own global config/memory) is disabled.
// The persona's instructions are injected per-call via `--append-system-prompt`
// (appends to Claude Code's own base system prompt rather than replacing it,
// so baseline safety/tool framing stays intact). No `--allowedTools` are
// granted yet — this slice is reply-only, no file/knowledge access or tool
// calling (that's the next increment, see the update's wiki.md), so
// `--permission-mode dontAsk` with an empty allowlist means nothing beyond
// plain text generation can happen even if asked.
//
// Session continuity: the first call for a chat session has no session id;
// claude returns one in its JSON result, which the frontend stores and
// passes back via `--resume` on every later turn in that same session —
// cheaper than a cold start and means the CLI's own transcript (not ours)
// is the source of truth for that agent's memory of the conversation.

use serde::Serialize;
use std::env::temp_dir;
use std::io::Write;
use std::process::Command;

use crate::util::resolve_binary;

// Self-serve diagnostics: the frontend posts a label + a JSON snapshot of
// real computed layout state (window size, html/body/AIAssistant DOM node
// geometry) here instead of the browser console, so investigating a
// rendering bug in the packaged app doesn't require the user to open
// devtools at all — just reproduce the symptom once, then read this file.
#[tauri::command]
pub fn debug_log(message: String) -> Result<(), String> {
    let path = temp_dir().join("masters-wheel-debug.log");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{message}").map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct AgentReply {
    pub text: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
}

#[tauri::command]
pub fn ask_agent(message: String, instructions: String, session_id: Option<String>) -> Result<AgentReply, String> {
    let binary = resolve_binary("claude");
    let mut command = Command::new(&binary);
    command
        .current_dir(temp_dir())
        .arg("-p")
        .arg(&message)
        .arg("--output-format")
        .arg("json")
        .arg("--append-system-prompt")
        .arg(&instructions)
        .arg("--permission-mode")
        .arg("dontAsk");

    if let Some(id) = session_id.filter(|id| !id.is_empty()) {
        command.arg("--resume").arg(id);
    }

    let output = command
        .output()
        .map_err(|e| format!("The Claude Code CLI isn't available ({e}). Make sure `claude` is installed and you're logged in."))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let parsed: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Couldn't read Claude's reply ({e})."))?;

    let text = parsed
        .get("result")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let new_session_id = parsed
        .get("session_id")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();

    Ok(AgentReply { text, session_id: new_session_id })
}
