// Transcodes a video into an H.264/AAC MP4 via ffmpeg, for source formats
// WKWebView's <video> element can't actually play — WebM (VP8/VP9 + Opus)
// chief among them. Unlike Chrome/Firefox, which bundle their own VP8/VP9/
// Opus decoders, Safari/WebKit on macOS plays video entirely through the
// OS's AVFoundation codec support, which has never included WebM's codecs —
// so a dropped-in .webm clip loads as a real file (storage/convertFileSrc
// both succeed) but the <video> element just shows the native "can't play
// this" icon. Re-encoding once at import time, rather than trying to make
// WebM play, sidesteps that platform gap entirely. Same shelled-out ffmpeg
// pattern as transcribe.rs; kept in its own file since this is a distinct
// concern (playback compatibility, not speech-to-text) — see
// src/lib/training's TRANSCODE_EXTENSIONS for which source extensions
// trigger this.

use std::process::Command;

use crate::util::resolve_binary;

#[tauri::command]
pub fn transcode_to_mp4(source_path: String, dest_path: String) -> Result<(), String> {
    let output = Command::new(resolve_binary("ffmpeg"))
        .args([
            "-y",
            "-i",
            &source_path,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            &dest_path,
        ])
        .output()
        .map_err(|e| format!("ffmpeg isn't available ({e}). Install it with `brew install ffmpeg`."))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(())
}
