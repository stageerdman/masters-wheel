// Tauri commands for storage. Videos are named by Space id + record id
// (folders can be renamed, ids can't).
//
// Every command runs on the blocking pool, never the main thread: they
// wait on the engine lock the worker also takes, and a wait there must not
// freeze the window.

use tauri::{AppHandle, Manager};

use crate::onedrive::commands::blocking;
use crate::onedrive::{CommandError, OneDriveSession};

use super::model::{Mode, video_key};
use super::service::{StorageService, unix_now};
use super::status::{Overview, SwitchPreview, overview, preview_switch};

async fn with_storage<T: Send + 'static>(
    app: AppHandle,
    task: impl FnOnce(&StorageService) -> T + Send + 'static,
) -> Result<T, CommandError> {
    blocking(app, move |app| Ok(task(&app.state::<StorageService>()))).await
}

#[tauri::command]
pub async fn storage_overview(app: AppHandle) -> Result<Overview, CommandError> {
    with_storage(app, |storage| storage.read(|engine| overview(engine, unix_now()))).await
}

#[tauri::command]
pub async fn storage_preview_switch(app: AppHandle, mode: Mode) -> Result<SwitchPreview, CommandError> {
    with_storage(app, move |storage| {
        let disk = storage.disk();
        storage.read(|engine| preview_switch(engine, mode, unix_now(), disk))
    })
    .await
}

#[tauri::command]
pub async fn storage_set_mode(app: AppHandle, mode: Mode) -> Result<(), CommandError> {
    with_storage(app, move |storage| storage.update(|engine| engine.set_mode(mode))).await
}

#[tauri::command]
pub async fn storage_video_opened(app: AppHandle, space_id: String, record_id: String) -> Result<(), CommandError> {
    with_storage(app, move |storage| {
        let disk = storage.disk();
        storage.update(|engine| engine.video_opened(&video_key(&space_id, &record_id), unix_now(), disk));
    })
    .await
}

#[tauri::command]
pub async fn storage_video_closed(app: AppHandle, space_id: String, record_id: String) -> Result<(), CommandError> {
    with_storage(app, move |storage| storage.update(|engine| engine.unpin(&video_key(&space_id, &record_id)))).await
}

// Call after the app removed the video (or its whole record) from disk.
#[tauri::command]
pub async fn storage_video_removed(app: AppHandle, space_id: String, record_id: String) -> Result<(), CommandError> {
    with_storage(app, move |storage| storage.update(|engine| engine.video_removed(&video_key(&space_id, &record_id))))
        .await
}

#[tauri::command]
pub async fn storage_wake(app: AppHandle) -> Result<(), CommandError> {
    with_storage(app, StorageService::recheck).await
}

// "Download and disconnect" brings every video home first; the worker
// signs out once the last one lands. Otherwise it signs out now, and
// anything only in OneDrive stays there ("Disconnect anyway").
#[tauri::command]
pub async fn storage_disconnect(app: AppHandle, download_first: bool) -> Result<(), CommandError> {
    blocking(app, move |app| {
        let storage = app.state::<StorageService>();
        if download_first {
            storage.update(|engine| engine.set_disconnecting(true));
            return Ok(());
        }
        storage.disconnect_now(&app.state::<OneDriveSession>())
    })
    .await
}

#[tauri::command]
pub async fn storage_stop_disconnect(app: AppHandle) -> Result<(), CommandError> {
    with_storage(app, |storage| storage.update(|engine| engine.set_disconnecting(false))).await
}

#[tauri::command]
pub async fn storage_retry_unreadable(app: AppHandle) -> Result<(), CommandError> {
    with_storage(app, |storage| storage.update(|engine| engine.retry_unreadable())).await
}
