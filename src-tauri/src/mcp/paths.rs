// Where Performance Review records live on disk, resolved without a
// Tauri `AppHandle` — the `mcp_server` stdio loop (see server.rs) runs as
// a plain re-exec of this same binary with no Tauri context at all, so it
// can't use `app.path()` the way spaces.rs does for the main process.
// assistant.rs computes the active Space's real records root (which needs
// an AppHandle to resolve) and passes it in via MASTERS_WHEEL_RECORDS_ROOT
// (see mcp/config.rs::write_config_file) — this just reads that back. The
// `$HOME/Documents/Master's Wheel/Default/records` fallback only matters
// if that env var is ever missing (shouldn't happen in practice, since
// every caller sets it) — macOS-only assumption, same as the rest of this
// app today.

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
