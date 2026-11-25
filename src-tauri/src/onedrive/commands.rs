// Tauri commands the webview calls. The webview only ever gets a Status or
// file text back, never a token. Everything blocks (Keychain, curl, the
// browser round-trip), so each command runs off the main thread.

use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use super::error::OneDriveError;
use super::graph;
use super::session::{OneDriveSession, Status};

async fn blocking<T: Send + 'static>(
    app: AppHandle,
    task: impl FnOnce(&OneDriveSession) -> Result<T, OneDriveError> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || task(&app.state::<OneDriveSession>()))
        .await
        .map_err(|e| format!("Internal error in OneDrive ({e})."))?
        .map_err(String::from)
}

#[tauri::command]
pub async fn onedrive_status(app: AppHandle) -> Result<Status, String> {
    blocking(app, |session| session.status()).await
}

#[tauri::command]
pub async fn onedrive_connect(app: AppHandle) -> Result<Status, String> {
    let opener = app.clone();
    blocking(app, move |session| {
        session.sign_in(|url| {
            opener
                .opener()
                .open_url(url, None::<&str>)
                .map_err(|e| OneDriveError::Internal(format!("couldn't open the browser: {e}")))
        })
    })
    .await
}

#[tauri::command]
pub fn onedrive_cancel_connect(app: AppHandle) {
    app.state::<OneDriveSession>().cancel_sign_in();
}

#[tauri::command]
pub async fn onedrive_disconnect(app: AppHandle) -> Result<Status, String> {
    blocking(app, |session| session.sign_out()).await
}

#[tauri::command]
pub async fn onedrive_ensure_folder(app: AppHandle, path: String) -> Result<(), String> {
    blocking(app, move |session| graph::ensure_folder(&session.access_token()?, &path)).await
}

#[tauri::command]
pub async fn onedrive_read_text(app: AppHandle, path: String) -> Result<Option<String>, String> {
    blocking(app, move |session| graph::read_text(&session.access_token()?, &path)).await
}

#[tauri::command]
pub async fn onedrive_write_text(app: AppHandle, path: String, text: String) -> Result<(), String> {
    blocking(app, move |session| graph::write_text(&session.access_token()?, &path, &text)).await
}
