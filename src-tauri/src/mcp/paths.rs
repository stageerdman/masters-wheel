// Where Performance Review records and Training Room sessions live on
// disk, resolved without a Tauri `AppHandle` — the `mcp_server` stdio
// loop (see server.rs) runs as a plain re-exec of this same binary with
// no Tauri context at all, so it can't use `app.path()` the way
// spaces.rs does for the main process. assistant.rs computes the active
// Space's real roots (which need an AppHandle to resolve) and passes
// them in via MASTERS_WHEEL_RECORDS_ROOT/MASTERS_WHEEL_TRAINING_ROOT (see
// mcp/config.rs::write_config_file) — this just reads those back. The
// `$HOME/Documents/Master's Wheel/Default/...` fallbacks only matter if
// one of those env vars is ever missing (shouldn't happen in practice,
// since every caller sets them) — macOS-only assumption, same as the
// rest of this app today.

use std::path::PathBuf;

pub fn records_root() -> PathBuf {
    if let Ok(root) = std::env::var(crate::mcp::config::RECORDS_ROOT_ENV) {
        if !root.is_empty() {
            return PathBuf::from(root);
        }
    }
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join("Documents").join("Master's Wheel").join("Default").join("records")
}

pub fn record_dir(record_id: &str) -> PathBuf {
    records_root().join(record_id)
}

// The Space's whole training/ root — used by list_training_sessions/
// get_training_session, which (unlike the AITrainerPane's scoped tool
// below) need to resolve an arbitrary session_id the model passes in.
pub fn training_root() -> PathBuf {
    if let Ok(root) = std::env::var(crate::mcp::config::TRAINING_ROOT_ENV) {
        if !root.is_empty() {
            return PathBuf::from(root);
        }
    }
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join("Documents").join("Master's Wheel").join("Default").join("training")
}

pub fn training_session_dir(session_id: &str) -> PathBuf {
    training_root().join(session_id)
}

// Only set for an AITrainerPane call — see assistant.rs's `ask_agent` and
// mcp/config.rs::write_config_file. Unlike training_root() above, there's
// no reasonable fallback default: a training-session-scoped tool call
// with no session to scope to should fail cleanly, not silently read
// some other session's data.
pub fn training_session_path() -> Option<PathBuf> {
    std::env::var(crate::mcp::config::TRAINING_SESSION_PATH_ENV)
        .ok()
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}
