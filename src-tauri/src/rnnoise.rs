// On-device background-noise filter applied to audio before it's handed to
// the transcription API: ffmpeg's `arnndn` filter (RNNoise) with a small
// pretrained model, so a single-mic recording that also picked up
// background speech (e.g. someone else in the room) doesn't get that bleed
// transcribed. Mirrors ~/dev/transcriber's `track_separation.denoise_pcm`
// and its vendored `bd.rnnn` model, but applied inline in the extraction
// ffmpeg call rather than as a separate PCM pass, since this app has no
// track-isolation step to feed into.
//
// The model is shared infrastructure, not user data (same reasoning as
// knowledge/paths.rs's embedding_model_cache_dir), so it's cached once under
// the app's own data directory and downloaded lazily on first use, rather
// than bundled into the .app or requiring a manual setup script. Any
// failure to resolve/download/apply it just means the filter is skipped for
// that run — never a transcription failure.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const MODEL_URL: &str =
    "https://raw.githubusercontent.com/GregorR/rnnoise-models/master/beguiling-drafter-2018-08-30/bd.rnnn";

fn model_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("rnnoise-model").join("bd.rnnn"))
}

// Returns the cached model path, downloading it once if missing. `None`
// (never an error) on any failure, so callers simply skip the filter.
pub fn ensure_model(app: &AppHandle) -> Option<PathBuf> {
    let path = model_path(app)?;
    if path.exists() {
        return Some(path);
    }
    std::fs::create_dir_all(path.parent()?).ok()?;
    let output = std::process::Command::new("curl").args(["-fsSL", MODEL_URL, "-o"]).arg(&path).output().ok()?;
    if !output.status.success() || !path.exists() {
        let _ = std::fs::remove_file(&path);
        return None;
    }
    Some(path)
}

// ffmpeg `-af` filter chain for this model: RNNoise runs at 48 kHz, so
// resample up for the filter — libmp3lame downstream accepts 48 kHz input
// directly, so there's no need to resample back down afterwards.
pub fn filter_arg(model: &std::path::Path) -> String {
    format!("aresample=48000,arnndn=m={}", model.to_string_lossy())
}
