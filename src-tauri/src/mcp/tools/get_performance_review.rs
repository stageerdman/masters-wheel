// The gated tool: real notes/transcript/analysis content for one record.
// Permission is checked by mcp/permission.rs before any content is read
// at all — see that module for the tag/always-allow/ask-the-user logic.
//
// Text documents are paginated by *us*, in plain characters — not left to
// the Claude CLI's own "large tool output" fallback. That fallback writes
// oversized results to a file and tells the model to re-read it via the
// Read tool, but (a) this app disables built-in tools including Read, on
// purpose, to avoid ~20k tokens/reply of schema bloat (see assistant.rs),
// and (b) even with Read enabled, our JSON-encoded output puts the whole
// document on one giant line (real newlines become escaped `\n`), and
// Read truncates long lines — confirmed by hand: it silently capped a
// real transcript at its first ~2KB regardless. Paginating here sidesteps
// both problems: the model always gets exact, predictable chunks
// straight from this tool.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::mcp::paths::record_dir;

// Comfortably under the size where the CLI's own fallback persistence
// kicks in (observed to trigger around ~50KB combined output) — leaves
// headroom for meta/notes/analysis alongside one transcript chunk.
const DEFAULT_LIMIT: usize = 16_000;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GetPerformanceReviewInput {
    /// The record_id field from one of list_performance_reviews's results.
    pub record_id: String,
    /// Which parts to read — any of "meta", "notes", "transcript",
    /// "analysis". Omit to get all four.
    #[serde(default = "default_documents")]
    pub documents: Vec<String>,
    /// Character offset into each requested text document (notes/
    /// transcript/analysis — meta is never chunked) to start reading
    /// from. A long document comes back in bounded chunks: if a
    /// returned document's `has_more` is true, call again with
    /// offset = that document's own `offset + content.length` to
    /// continue reading from where it left off, and repeat until
    /// `has_more` is false.
    #[serde(default)]
    pub offset: usize,
    /// Max characters to return per text document this call.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_documents() -> Vec<String> {
    vec!["meta".into(), "notes".into(), "transcript".into(), "analysis".into()]
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
    // Char-indexed, not byte-indexed, so a chunk boundary never lands
    // inside a multi-byte UTF-8 character — these transcripts are often
    // non-English (e.g. Czech diacritics).
    fn new(text: &str, offset: usize, limit: usize) -> Self {
        let total_length = text.chars().count();
        let start = offset.min(total_length);
        let end = start.saturating_add(limit).min(total_length);
        let content = text.chars().skip(start).take(end - start).collect();
        Self { content, offset: start, total_length, has_more: end < total_length }
    }
}

#[derive(Debug, Default, Serialize)]
pub struct PerformanceReviewContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<DocumentSlice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript: Option<DocumentSlice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analysis: Option<DocumentSlice>,
}

// Best-effort title lookup for the permission prompt — falls back to the
// bare recordId (still meaningful; see list_performance_reviews.rs,
// record_id is a human-written "<date> <title>" folder name) if meta.json
// is missing or corrupt. Takes `root` explicitly (rather than resolving
// it internally via mcp::paths::records_root(), which reads an env var
// only ever set for the MCP subprocess) so a main-process caller like
// assistant.rs can pass the active Space's real records dir directly —
// same pattern list_performance_reviews::list() already uses, and for
// the same reason: the main process's own env never has that var set, so
// calling through the subprocess-only path here would silently fall back
// to the hardcoded Default Space.
pub fn title_for(root: &Path, record_id: &str) -> String {
    let Ok(text) = std::fs::read_to_string(root.join(record_id).join("meta.json")) else {
        return record_id.to_string();
    };
    serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|value| value.get("title").and_then(|t| t.as_str()).map(str::to_string))
        .unwrap_or_else(|| record_id.to_string())
}

pub fn read(record_id: &str, documents: &[String], offset: usize, limit: usize) -> PerformanceReviewContent {
    let dir = record_dir(record_id);
    let mut out = PerformanceReviewContent::default();
    for document in documents {
        match document.as_str() {
            "meta" => {
                out.meta = std::fs::read_to_string(dir.join("meta.json"))
                    .ok()
                    .and_then(|text| serde_json::from_str(&text).ok());
            }
            "notes" => {
                out.notes = std::fs::read_to_string(dir.join("user_notes.md"))
                    .ok()
                    .map(|text| DocumentSlice::new(&text, offset, limit));
            }
            "transcript" => {
                out.transcript = std::fs::read_to_string(dir.join("transcript.md"))
                    .ok()
                    .map(|text| DocumentSlice::new(&text, offset, limit));
            }
            "analysis" => {
                out.analysis = std::fs::read_to_string(dir.join("ai_analysis.md"))
                    .ok()
                    .map(|text| DocumentSlice::new(&text, offset, limit));
            }
            _ => {}
        }
    }
    out
}
