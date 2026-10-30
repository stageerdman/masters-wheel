mod assistant;
mod media_server;
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
    .manage(transcribe::TranscribeJobs::default())
    .invoke_handler(tauri::generate_handler![
      transcribe::probe_audio_tracks,
      transcribe::generate_transcript,
      transcribe::cancel_generate_transcript,
      assistant::ask_agent,
      assistant::debug_log
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
        media_server::spawn(documents.join("Master's Wheel"));
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
