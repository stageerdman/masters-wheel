// Tauri commands for storage. Videos are named by Space id + record id
// (folders can be renamed, ids can't).

use tauri::State;

use super::model::{Mode, video_key};
use super::service::{StorageService, unix_now};
use super::status::{Overview, SwitchPreview, overview, preview_switch};

#[tauri::command]
pub fn storage_overview(storage: State<'_, StorageService>) -> Overview {
    storage.read(|engine| overview(engine, unix_now()))
}

#[tauri::command]
pub fn storage_preview_switch(storage: State<'_, StorageService>, mode: Mode) -> SwitchPreview {
    let disk = storage.disk();
    storage.read(|engine| preview_switch(engine, mode, unix_now(), disk))
}

#[tauri::command]
pub fn storage_set_mode(storage: State<'_, StorageService>, mode: Mode) {
    storage.update(|engine| engine.set_mode(mode));
}

#[tauri::command]
pub fn storage_video_opened(storage: State<'_, StorageService>, space_id: String, record_id: String) {
    let disk = storage.disk();
    storage.update(|engine| engine.video_opened(&video_key(&space_id, &record_id), unix_now(), disk));
}

#[tauri::command]
pub fn storage_video_closed(storage: State<'_, StorageService>, space_id: String, record_id: String) {
    storage.update(|engine| engine.unpin(&video_key(&space_id, &record_id)));
}

// Call after the app removed the video (or its whole record) from disk.
#[tauri::command]
pub fn storage_video_removed(storage: State<'_, StorageService>, space_id: String, record_id: String) {
    storage.update(|engine| engine.video_removed(&video_key(&space_id, &record_id)));
}

#[tauri::command]
pub fn storage_wake(storage: State<'_, StorageService>) {
    storage.recheck();
}

#[tauri::command]
pub fn storage_retry_unreadable(storage: State<'_, StorageService>) {
    storage.update(|engine| engine.retry_unreadable());
}
