// Optional OneDrive storage: Microsoft sign-in and the app's own folder in
// the user's OneDrive. See updates/2026-11-25 ONEDRIVE - OPEN/.
//   auth.rs        - pure OAuth pieces: authorize URL, redirect, token responses
//   pkce.rs        - PKCE verifier/challenge and random tokens
//   loopback.rs    - one-shot localhost listener that catches the redirect
//   curl.rs        - HTTP through curl, secrets on stdin
//   graph.rs       - the Graph calls the app makes, inside its app folder
//   drive.rs       - video files: upload sessions, items by id, downloads
//   token_store.rs - the Keychain item holding the refresh token
//   session.rs     - the signed-in account: sign in/out, access-token cache
//   commands.rs    - Tauri commands the webview calls
//   error.rs       - OneDriveError
// What happens to the videos themselves lives in ../storage/.

mod auth;
pub mod commands;
mod curl;
pub mod drive;
mod error;
mod graph;
mod loopback;
mod pkce;
mod session;
mod token_store;

pub use error::{CommandError, OneDriveError};
pub use graph::ensure_folder;
pub use session::OneDriveSession;
