// The Graph calls for video files: resumable upload sessions, items by id,
// downloads and deletes. Upload-session and download URLs are
// pre-authenticated by Microsoft, so they're called without our bearer
// token (Graph rejects one there). Paths are relative to the app folder,
// like in graph.rs.

use std::path::Path;

use super::curl::{self, HttpRequest, HttpResponse, Transfer};
use super::error::OneDriveError;
use super::graph::{GRAPH, call, graph_error, item_url, json, split_path};

#[derive(Debug, Clone, PartialEq)]
pub struct DriveItem {
    pub id: String,
    pub size: u64,
    pub web_url: String,
    // Only present when the item is read by id; valid for about an hour.
    pub download_url: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum ChunkReply {
    // OneDrive wants the rest from this byte on.
    Next(u64),
    // The last chunk landed and OneDrive built the file.
    Done(DriveItem),
}

// `None` when nothing is at that path (or with that id).
pub fn item_at_path(token: &str, path: &str) -> Result<Option<DriveItem>, OneDriveError> {
    let segments = split_path(path)?;
    optional_item(call(token, "GET", &item_url(&segments), None)?)
}

pub fn item_by_id(token: &str, id: &str) -> Result<Option<DriveItem>, OneDriveError> {
    optional_item(call(token, "GET", &item_id_url(id), None)?)
}

pub fn delete_item(token: &str, id: &str) -> Result<(), OneDriveError> {
    let response = call(token, "DELETE", &item_id_url(id), None)?;
    if response.is_success() || response.status == 404 {
        return Ok(());
    }
    Err(graph_error(&response).context("deleting a video"))
}

// "replace": an upload for a path always wins over an older copy there.
pub fn create_upload_session(token: &str, path: &str) -> Result<String, OneDriveError> {
    let segments = split_path(path)?;
    let body = r#"{"item":{"@microsoft.graph.conflictBehavior":"replace"}}"#;
    let response = call(token, "POST", &format!("{}/createUploadSession", item_url(&segments)), Some(body))?;
    json(&response)?
        .get("uploadUrl")
        .and_then(|u| u.as_str())
        .map(str::to_string)
        .ok_or_else(|| OneDriveError::Graph { status: response.status, message: "no uploadUrl".into() })
}

// Sends bytes `start..start+len` of a `total`-byte file. `chunk` holds
// exactly those bytes.
pub fn upload_chunk(upload_url: &str, chunk: &Path, start: u64, len: u64, total: u64) -> Result<ChunkReply, OneDriveError> {
    let response = curl::send(&HttpRequest {
        method: "PUT",
        url: upload_url,
        headers: vec![format!("Content-Range: bytes {start}-{}/{total}", start + len - 1)],
        body_file: Some(chunk),
        transfer: Transfer::Long,
        ..Default::default()
    })?;
    parse_chunk_reply(&response)
}

// Where an existing session stands, e.g. after a restart.
pub fn upload_status(upload_url: &str) -> Result<u64, OneDriveError> {
    let response = curl::send(&HttpRequest { url: upload_url, ..Default::default() })?;
    match parse_chunk_reply(&response)? {
        ChunkReply::Next(offset) => Ok(offset),
        ChunkReply::Done(_) => Err(OneDriveError::Internal("upload session already finished".into())),
    }
}

// Appends to `part` from its current size, so an interrupted download
// carries on where it stopped.
pub fn download(download_url: &str, part: &Path) -> Result<(), OneDriveError> {
    let response = curl::send(&HttpRequest {
        url: download_url,
        output_file: Some(part),
        transfer: Transfer::Long,
        ..Default::default()
    })?;
    // 416: the part file already holds the whole thing.
    if response.is_success() || response.status == 416 {
        return Ok(());
    }
    Err(OneDriveError::Graph { status: response.status, message: "download failed".into() })
}

fn item_id_url(id: &str) -> String {
    let safe: String = id.chars().filter(|c| c.is_ascii_alphanumeric() || matches!(c, '!' | '-' | '_')).collect();
    format!("{GRAPH}/me/drive/items/{safe}")
}

fn optional_item(response: HttpResponse) -> Result<Option<DriveItem>, OneDriveError> {
    if response.status == 404 {
        return Ok(None);
    }
    parse_item(&json(&response)?).map(Some)
}

fn parse_item(value: &serde_json::Value) -> Result<DriveItem, OneDriveError> {
    let text = |key: &str| value.get(key).and_then(|v| v.as_str()).map(str::to_string);
    let id = text("id").ok_or_else(|| OneDriveError::Internal("drive item without an id".into()))?;
    Ok(DriveItem {
        id,
        size: value.get("size").and_then(|v| v.as_u64()).unwrap_or(0),
        web_url: text("webUrl").unwrap_or_default(),
        download_url: text("@microsoft.graph.downloadUrl"),
    })
}

fn parse_chunk_reply(response: &HttpResponse) -> Result<ChunkReply, OneDriveError> {
    let value = json(response)?;
    if response.status == 200 || response.status == 201 {
        return parse_item(&value).map(ChunkReply::Done);
    }
    // e.g. {"nextExpectedRanges":["26214400-"]}
    value
        .pointer("/nextExpectedRanges/0")
        .and_then(|r| r.as_str())
        .and_then(|r| r.split('-').next())
        .and_then(|start| start.parse().ok())
        .map(ChunkReply::Next)
        .ok_or_else(|| OneDriveError::Graph { status: response.status, message: "no nextExpectedRanges".into() })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reply(status: u16, body: &str) -> Result<ChunkReply, OneDriveError> {
        parse_chunk_reply(&HttpResponse { status, body: body.into() })
    }

    #[test]
    fn chunk_replies_give_the_next_offset_or_the_item() {
        assert_eq!(reply(202, r#"{"nextExpectedRanges":["10485760-"]}"#).unwrap(), ChunkReply::Next(10485760));
        assert_eq!(
            reply(201, r#"{"id":"A!1","size":42,"webUrl":"https://x/v"}"#).unwrap(),
            ChunkReply::Done(DriveItem { id: "A!1".into(), size: 42, web_url: "https://x/v".into(), download_url: None })
        );
    }

    #[test]
    fn chunk_errors_keep_their_status() {
        assert!(matches!(reply(416, r#"{"error":{"message":"range"}}"#), Err(OneDriveError::Graph { status: 416, .. })));
        assert!(matches!(reply(202, "{}"), Err(OneDriveError::Graph { status: 202, .. })));
    }

    #[test]
    fn item_ids_cannot_escape_the_items_path() {
        assert_eq!(item_id_url("8A3F!123"), "https://graph.microsoft.com/v1.0/me/drive/items/8A3F!123");
        assert_eq!(item_id_url("../x?y"), "https://graph.microsoft.com/v1.0/me/drive/items/xy");
    }
}
