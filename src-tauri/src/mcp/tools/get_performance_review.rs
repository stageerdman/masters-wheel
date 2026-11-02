// The gated tool: real notes/transcript/analysis content for one record.
// Permission is checked by mcp/permission.rs before any content is read
// at all — see that module for the tag/always-allow/ask-the-user logic.

use serde::{Deserialize, Serialize};

use crate::mcp::paths::record_dir;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GetPerformanceReviewInput {
    /// The record_id field from one of list_performance_reviews's results.
    pub record_id: String,
    /// Which parts to read — any of "meta", "notes", "transcript",
    /// "analysis". Omit to get all four.
    #[serde(default = "default_documents")]
    pub documents: Vec<String>,
}

fn default_documents() -> Vec<String> {
    vec!["meta".into(), "notes".into(), "transcript".into(), "analysis".into()]
}

#[derive(Debug, Default, Serialize)]
pub struct PerformanceReviewContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analysis: Option<String>,
}

// Best-effort title lookup for the permission prompt — falls back to the
// bare recordId (still meaningful; see list_performance_reviews.rs,
// record_id is a human-written "<date> <title>" folder name) if meta.json
// is missing or corrupt.
pub fn title_for(record_id: &str) -> String {
    let Ok(text) = std::fs::read_to_string(record_dir(record_id).join("meta.json")) else {
        return record_id.to_string();
    };
    serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|value| value.get("title").and_then(|t| t.as_str()).map(str::to_string))
        .unwrap_or_else(|| record_id.to_string())
}

pub fn read(record_id: &str, documents: &[String]) -> PerformanceReviewContent {
    let dir = record_dir(record_id);
    let mut out = PerformanceReviewContent::default();
    for document in documents {
        match document.as_str() {
            "meta" => {
                out.meta = std::fs::read_to_string(dir.join("meta.json"))
                    .ok()
                    .and_then(|text| serde_json::from_str(&text).ok());
            }
            "notes" => out.notes = std::fs::read_to_string(dir.join("user_notes.md")).ok(),
            "transcript" => out.transcript = std::fs::read_to_string(dir.join("transcript.md")).ok(),
            "analysis" => out.analysis = std::fs::read_to_string(dir.join("ai_analysis.md")).ok(),
            _ => {}
        }
    }
    out
}
