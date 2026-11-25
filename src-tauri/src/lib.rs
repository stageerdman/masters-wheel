mod assistant;
mod avatar;
mod claude_cli;
mod knowledge;
mod media_server;
pub mod mcp;
mod onedrive;
mod rnnoise;
mod roleplay;
mod spaces;
mod storage;
mod transcode;
mod transcribe;
mod util;

use tauri::Manager;

// Loads the project's `.env` (ELEVENLABS_API_KEY) into the process
// environment before anything else runs — same flat `KEY=VALUE` convention
// as ~/dev/transcriber's `app/__init__.py`. The path is resolved at
// *compile* time (`CARGO_MANIFEST_DIR`), not from the runtime working
// directory, so it still finds the project's `.env` when launched as an
// installed .app (whose cwd isn't the project root) as well as in `tauri
// dev`. An existing environment variable always wins over `.env`.
fn load_dotenv() {
  let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../.env");
  let Ok(contents) = std::fs::read_to_string(path) else { return };
  for line in contents.lines() {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
      continue;
    }
    if let Some((key, value)) = line.split_once('=') {
      let key = key.trim();
      if !key.is_empty() && std::env::var(key).is_err() {
        // Safe: called once at startup before any other thread exists.
        unsafe { std::env::set_var(key, value.trim()) };
      }
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  load_dotenv();
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .manage(transcribe::TranscribeJobs::default())
    .manage(onedrive::OneDriveSession::default())
    .invoke_handler(tauri::generate_handler![
      transcribe::probe_audio_tracks,
      transcribe::generate_transcript,
      transcribe::generate_voice_transcript,
      transcribe::cancel_generate_transcript,
      assistant::ask_agent,
      assistant::name_chat,
      assistant::debug_log,
      claude_cli::run_claude_once,
      knowledge::commands::ingest_knowledge_file,
      knowledge::commands::remove_knowledge_file,
      avatar::read_image_as_data_url,
      mcp::bridge::sync_mcp_tags,
      onedrive::commands::onedrive_connect,
      onedrive::commands::onedrive_cancel_connect,
      onedrive::commands::onedrive_show_folder,
      onedrive::commands::onedrive_ensure_folder,
      onedrive::commands::onedrive_read_text,
      onedrive::commands::onedrive_write_text,
      roleplay::generate_setup_reply,
      roleplay::generate_persona,
      roleplay::generate_roleplay_turn,
      roleplay::generate_session_adjustment,
      roleplay::generate_insight,
      storage::commands::storage_overview,
      storage::commands::storage_preview_switch,
      storage::commands::storage_set_mode,
      storage::commands::storage_video_opened,
      storage::commands::storage_video_closed,
      storage::commands::storage_video_removed,
      storage::commands::storage_wake,
      storage::commands::storage_retry_unreadable,
      storage::commands::storage_disconnect,
      storage::commands::storage_stop_disconnect,
      spaces::migrate_legacy_data_to_default_space,
      spaces::switch_space_media_root,
      transcode::transcode_to_mp4
    ])
    .setup(|app| {
      // Release builds log too: a stalled upload must leave a trail. The
      // file sits in the app data folder (logs/), next to the ledger.
      let mut logger = tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .max_file_size(5_000_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne);
      if let Ok(data_dir) = app.path().app_data_dir() {
        let folder = tauri_plugin_log::TargetKind::Folder { path: data_dir.join("logs"), file_name: Some("app".into()) };
        logger = logger.target(tauri_plugin_log::Target::new(folder));
      }
      app.handle().plugin(logger.build())?;
      if let Ok(documents) = app.path().document_dir() {
        // Guesses "Default" as the initial root — correct on every
        // launch except the rare case where the user's last-active Space
        // wasn't Default, and even then only until the frontend mounts
        // and calls switch_space_media_root with the real active Space
        // moments later (src/lib/spaces/context.tsx's init effect), well
        // before anything could actually request a video.
        let wheel_root = documents.join("Master's Wheel");
        let initial_root = wheel_root.join("Default").join("records");
        let media = media_server::spawn(initial_root);
        if let Ok(data_dir) = app.path().app_data_dir() {
          let storage = storage::StorageService::spawn(app.handle().clone(), wheel_root, data_dir);
          let (streams, handle) = (storage.clone(), app.handle().clone());
          media.set_cloud_fallback(std::sync::Arc::new(move |path| {
            streams.stream_url_for_path(path, &handle.state::<onedrive::OneDriveSession>())
          }));
          app.manage(storage);
        }
        app.manage(media);
      }
      app.manage(mcp::bridge::spawn(app.handle().clone()));
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
