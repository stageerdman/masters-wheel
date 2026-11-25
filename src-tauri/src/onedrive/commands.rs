// Tauri commands the webview calls. The webview only ever gets a Status or
// file text back, never a token. Everything blocks (Keychain, curl, the
// browser round-trip), so each command runs off the main thread. Errors
// arrive as { kind, message } (error.rs CommandError).

use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use super::error::{CommandError, OneDriveError};
use super::graph;
use super::session::{OneDriveSession, Status};

pub async fn blocking<T: Send + 'static>(
    app: AppHandle,
    task: impl FnOnce(&AppHandle) -> Result<T, OneDriveError> + Send + 'static,
) -> Result<T, CommandError> {
    tauri::async_runtime::spawn_blocking(move || task(&app))
        .await
        .map_err(|e| OneDriveError::Internal(format!("OneDrive task stopped: {e}")))?
        .map_err(CommandError::from)
}

async fn with_session<T: Send + 'static>(
    app: AppHandle,
    task: impl FnOnce(&OneDriveSession) -> Result<T, OneDriveError> + Send + 'static,
) -> Result<T, CommandError> {
    blocking(app, move |app| task(&app.state::<OneDriveSession>())).await
}

fn open_in_browser(app: &AppHandle, url: &str) -> Result<(), OneDriveError> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| OneDriveError::Internal(format!("couldn't open the browser: {e}")))
}

#[tauri::command]
pub async fn onedrive_connect(app: AppHandle) -> Result<Status, CommandError> {
    blocking(app, |app| app.state::<OneDriveSession>().sign_in(|url| open_in_browser(app, url))).await
}

#[tauri::command]
pub fn onedrive_cancel_connect(app: AppHandle) {
    app.state::<OneDriveSession>().cancel_sign_in();
}

// "Show in OneDrive": the app folder on OneDrive web.
#[tauri::command]
pub async fn onedrive_show_folder(app: AppHandle) -> Result<(), CommandError> {
    blocking(app, |app| {
        let url = graph::app_folder_web_url(&app.state::<OneDriveSession>().access_token()?)?;
        open_in_browser(app, &url)
    })
    .await
}

#[tauri::command]
pub async fn onedrive_ensure_folder(app: AppHandle, path: String) -> Result<(), CommandError> {
    with_session(app, move |session| graph::ensure_folder(&session.access_token()?, &path)).await
}

#[tauri::command]
pub async fn onedrive_read_text(app: AppHandle, path: String) -> Result<Option<String>, CommandError> {
    with_session(app, move |session| graph::read_text(&session.access_token()?, &path)).await
}

#[tauri::command]
pub async fn onedrive_write_text(app: AppHandle, path: String, text: String) -> Result<(), CommandError> {
    with_session(app, move |session| graph::write_text(&session.access_token()?, &path, &text)).await
}
