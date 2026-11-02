// Where Performance Review records live on disk, resolved without a
// Tauri `AppHandle` — the `mcp_server` stdio loop (see server.rs) runs as
// a plain re-exec of this same binary with no Tauri context at all, so it
// can't use `app.path()` the way knowledge/paths.rs does for app data.
// Matches src/lib/records/index.ts's own layout exactly: one subfolder
// per record (the folder name IS the record id) under
// ~/Documents/Master's Wheel/. macOS-only assumption, same as the rest of
// this app today — $HOME/Documents is fixed on macOS, no XDG lookup needed.

use std::path::PathBuf;

const STORAGE_DIR_NAME: &str = "Master's Wheel";

pub fn records_root() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join("Documents").join(STORAGE_DIR_NAME)
}

pub fn record_dir(record_id: &str) -> PathBuf {
    records_root().join(record_id)
}
