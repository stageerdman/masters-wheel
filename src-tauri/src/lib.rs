mod assistant;
mod avatar;
mod claude_cli;
mod knowledge;
mod media_server;
pub mod mcp;
mod roleplay;
mod spaces;
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
      roleplay::generate_setup_reply,
      roleplay::generate_persona,
      roleplay::generate_roleplay_turn,
      roleplay::generate_session_adjustment,
      roleplay::generate_insight,
      spaces::migrate_legacy_data_to_default_space,
      spaces::switch_space_media_root,
      transcode::transcode_to_mp4
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      if let Ok(documents) = app.path().document_dir() {
        // Guesses "Default" as the initial root — correct on every
        // launch except the rare case where the user's last-active Space
        // wasn't Default, and even then only until the frontend mounts
        // and calls switch_space_media_root with the real active Space
        // moments later (src/lib/spaces/context.tsx's init effect), well
        // before anything could actually request a video.
        let initial_root = documents.join("Master's Wheel").join("Default").join("records");
        app.manage(media_server::spawn(initial_root));
      }
      app.manage(mcp::bridge::spawn(app.handle().clone()));
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
