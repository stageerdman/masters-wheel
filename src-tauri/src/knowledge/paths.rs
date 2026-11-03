// Where an agent's knowledge lives on disk — under that agent's own
// Space (see src/lib/spaces and src-tauri/src/spaces.rs), since each
// Space has a genuinely separate set of Agents.
//
//   .../<space>/agents/<agent_id>/knowledge/<file_id>_<original name>
//   .../<space>/agents/<agent_id>/knowledge.db
//
// The embedding model cache is the one exception: shared infrastructure
// (a downloaded model, not user data), so it stays under the app's own
// data directory regardless of Space.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn agent_knowledge_dir(app: &AppHandle, space_folder: &str, agent_id: &str) -> Result<PathBuf, String> {
    Ok(crate::spaces::agents_dir(app, space_folder)?.join(agent_id).join("knowledge"))
}

pub fn agent_db_path(app: &AppHandle, space_folder: &str, agent_id: &str) -> Result<PathBuf, String> {
    Ok(crate::spaces::agents_dir(app, space_folder)?.join(agent_id).join("knowledge.db"))
}

pub fn embedding_model_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("embedding-model-cache"))
        .map_err(|e| format!("Couldn't resolve the app data directory: {e}"))
}
