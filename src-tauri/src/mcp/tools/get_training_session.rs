// The gated tool: real notes/transcript content for one Training Room
// session, across any discipline. Permission is checked by
// mcp/permission.rs before any content is read at all — same shape as
// get_performance_review, generalized to a second resource kind (see
// mcp/bridge.rs::ResourceKind). Reads session.json directly, the same
// file src/lib/training's writeSessionMeta writes — this module has no
// typed model of it on either side of the Rust/TS boundary, same
// "walk the raw JSON by field name" approach get_roleplay_transcript.rs
// already takes for the same file's `roleplay` field.
//
// "notes" and "transcript" mean different things per discipline, since
// there's no single shared document shape across them: Voice Training
// and Learning each carry a real transcript per clip/file
// (`clips[].transcriptRaw` / `learning.files[].transcriptRaw`), notes_text
// concatenates whichever exists; Learning's own notes aren't in the
// plain `notes` field at all (that's session-level notes, blank for
// Learning) but in `learning.blocks[].content`'s text blocks, in order —
// see TrainingRoom.data.ts's LearningBlock comment for why. Chat
// Roleplay's own transcript is already covered by the AI Trainer's
// dedicated, ungated get_roleplay_transcript tool — this tool's
// `notes`/`transcript` fields are simply empty for that discipline
// (nothing to concatenate), not an error.
//
// Text documents are paginated the same char-indexed way
// get_performance_review's DocumentSlice is, for the same reason (a
// chunk boundary must never land inside a multi-byte UTF-8 character).

use std::path::Path;

use serde::{Deserialize, Serialize};

const DEFAULT_LIMIT: usize = 16_000;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GetTrainingSessionInput {
    /// The session_id field from one of list_training_sessions's results.
    pub session_id: String,
    /// Which parts to read — any of "meta", "notes", "transcript". Omit
    /// to get all three.
    #[serde(default = "default_documents")]
    pub documents: Vec<String>,
    /// Character offset into each requested text document (notes/
    /// transcript — meta is never chunked) to start reading from. A long
    /// document comes back in bounded chunks: if a returned document's
    /// `has_more` is true, call again with offset = that document's own
    /// `offset + content.length` to continue reading from where it left
    /// off, and repeat until `has_more` is false.
    #[serde(default)]
    pub offset: usize,
    /// Max characters to return per text document this call.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_documents() -> Vec<String> {
    vec!["meta".into(), "notes".into(), "transcript".into()]
}

fn default_limit() -> usize {
    DEFAULT_LIMIT
}

#[derive(Debug, Serialize)]
pub struct DocumentSlice {
    pub content: String,
    pub offset: usize,
    pub total_length: usize,
    pub has_more: bool,
}

impl DocumentSlice {
    fn new(text: &str, offset: usize, limit: usize) -> Self {
        let total_length = text.chars().count();
        let start = offset.min(total_length);
        let end = start.saturating_add(limit).min(total_length);
        let content = text.chars().skip(start).take(end - start).collect();
        Self { content, offset: start, total_length, has_more: end < total_length }
    }
}

#[derive(Debug, Default, Serialize)]
pub struct TrainingSessionContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<DocumentSlice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript: Option<DocumentSlice>,
}

fn session_json(root: &Path, session_id: &str) -> Result<serde_json::Value, String> {
    let text = std::fs::read_to_string(root.join(session_id).join("session.json"))
        .map_err(|e| format!("Couldn't read this training session: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Couldn't parse this training session: {e}"))
}

// Best-effort title lookup for the permission prompt — falls back to the
// bare session_id if session.json is missing/corrupt. Takes `root`
// explicitly, same reasoning as get_performance_review::title_for.
pub fn title_for(root: &Path, session_id: &str) -> String {
    session_json(root, session_id)
        .ok()
        .and_then(|session| session.get("name").and_then(|v| v.as_str()).map(str::to_string))
        .unwrap_or_else(|| session_id.to_string())
}

// Learning's notes live as ordered {media, text} blocks, not a plain
// string — concatenate every text block's content, in document order,
// top (newest) to bottom. Every other discipline just uses its own flat
// `notes` field.
fn notes_text(session: &serde_json::Value) -> String {
    if let Some(learning) = session.get("learning").filter(|v| !v.is_null()) {
        let blocks = learning.get("blocks").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        return blocks
            .iter()
            .filter(|block| block.get("kind").and_then(|k| k.as_str()) == Some("text"))
            .filter_map(|block| block.get("content").and_then(|c| c.as_str()))
            .filter(|content| !content.is_empty())
            .collect::<Vec<_>>()
            .join("\n\n");
    }
    session.get("notes").and_then(|v| v.as_str()).unwrap_or_default().to_string()
}

// Voice Training's clips and Learning's files each carry their own
// transcriptRaw per item (both arrays already newest-first) — concatenate
// whichever collection this session actually has, labeled by file name.
fn transcript_text(session: &serde_json::Value) -> String {
    let mut parts = Vec::new();
    for clip in session.get("clips").and_then(|v| v.as_array()).into_iter().flatten() {
        append_transcript_part(&mut parts, clip);
    }
    if let Some(learning) = session.get("learning").filter(|v| !v.is_null()) {
        for file in learning.get("files").and_then(|v| v.as_array()).into_iter().flatten() {
            append_transcript_part(&mut parts, file);
        }
    }
    parts.join("\n\n")
}

fn append_transcript_part(parts: &mut Vec<String>, media: &serde_json::Value) {
    let Some(transcript) = media.get("transcriptRaw").and_then(|v| v.as_str()).filter(|t| !t.is_empty()) else {
        return;
    };
    let name = media.get("fileName").and_then(|v| v.as_str()).unwrap_or("media");
    parts.push(format!("--- {name} ---\n{transcript}"));
}

pub fn read(
    root: &Path,
    session_id: &str,
    documents: &[String],
    offset: usize,
    limit: usize,
) -> Result<TrainingSessionContent, String> {
    let session = session_json(root, session_id)?;
    let mut out = TrainingSessionContent::default();
    for document in documents {
        match document.as_str() {
            "meta" => {
                out.meta = Some(serde_json::json!({
                    "name": session.get("name"),
                    "toolType": session.get("toolType"),
                    "status": session.get("status"),
                    "lastUpdatedAt": session.get("lastUpdatedAt"),
                }));
            }
            "notes" => out.notes = Some(DocumentSlice::new(&notes_text(&session), offset, limit)),
            "transcript" => out.transcript = Some(DocumentSlice::new(&transcript_text(&session), offset, limit)),
            _ => {}
        }
    }
    Ok(out)
}
