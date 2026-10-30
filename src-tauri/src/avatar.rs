// Turns an arbitrary image file on disk into a small `data:` URL — this is
// what an agent's photoUrl actually stores (see src/lib/agents/types.ts).
// A data: URL is a plain string, so it survives being written straight
// into agent.json with no extra file to manage; it also can't rot the
// way a `blob:` URL does — a blob URL only lives as long as the webview
// session that created it, which is exactly why a previously-uploaded
// photo turned into a broken image after restarting the app.

use base64::Engine;
use image::imageops::FilterType;
use image::ImageFormat;
use std::io::Cursor;

// Plenty of resolution for a small circular avatar; keeps agent.json
// small regardless of how large the source photo was.
const MAX_DIMENSION: u32 = 256;

#[tauri::command]
pub async fn read_image_as_data_url(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let bytes = std::fs::read(&path).map_err(|e| format!("Couldn't read this image: {e}"))?;
        let decoded = image::load_from_memory(&bytes).map_err(|e| format!("Couldn't decode this image: {e}"))?;

        let resized = if decoded.width() > MAX_DIMENSION || decoded.height() > MAX_DIMENSION {
            decoded.resize(MAX_DIMENSION, MAX_DIMENSION, FilterType::Lanczos3)
        } else {
            decoded
        };

        let mut buffer = Cursor::new(Vec::new());
        resized.write_to(&mut buffer, ImageFormat::Png).map_err(|e| format!("Couldn't encode this image: {e}"))?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(buffer.into_inner());

        Ok(format!("data:image/png;base64,{encoded}"))
    })
    .await
    .map_err(|e| format!("Internal error processing this image ({e})."))?
}
