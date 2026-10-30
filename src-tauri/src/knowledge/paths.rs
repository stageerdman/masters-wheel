// Where an agent's knowledge lives on disk. Deliberately under the app's
// own data directory, not ~/Documents/Master's Wheel (see
// src/lib/records/index.ts) — this is internal model state the user never
// browses directly, same distinction transcribe.rs's temp files draw.
//
//   <app data dir>/agents/<agent_id>/knowledge/<file_id>_<original name>
//   <app data dir>/agents/<agent_id>/knowledge.db
//   <app data dir>/embedding-model-cache/

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Couldn't resolve the app data directory: {e}"))
}

pub fn agent_knowledge_dir(app: &AppHandle, agent_id: &str) -> Result<PathBuf, String> {
    Ok(app_data_root(app)?.join("agents").join(agent_id).join("knowledge"))
}

pub fn agent_db_path(app: &AppHandle, agent_id: &str) -> Result<PathBuf, String> {
    Ok(app_data_root(app)?.join("agents").join(agent_id).join("knowledge.db"))
}

pub fn embedding_model_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_root(app)?.join("embedding-model-cache"))
}
