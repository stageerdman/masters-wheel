// Content search across every Performance Review record — finds a
// phrase inside a transcript/notes/analysis, not just title/description
// (that's what list_performance_reviews is for). Gated the same way
// get_performance_review is: a matched record's real content is never
// shown unless this session already has it tagged/always-allowed. But
// unlike get_performance_review, a search can match many records at
// once, and blocking the whole call on one interactive permission
// prompt per match would mean firing several simultaneous 180s-timeout
// prompts from a single tool call — so this only ever *peeks* each
// match's existing access (mcp::permission::peek_access, side-effect-
// free) instead of asking. An unresolved match comes back flagged
// `content_access_required` with no snippet; the model is expected to
// follow up with a normal get_performance_review call on whichever
// match actually matters, which still runs the real interactive gate —
// just once, for the one record worth opening.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::mcp::bridge::ResourceKind;
use crate::mcp::permission;

const DEFAULT_MAX_RESULTS: usize = 20;
// Characters of context kept on each side of a content match — enough to
// read the surrounding exchange without hauling in the whole document.
const SNIPPET_RADIUS: usize = 160;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct SearchPerformanceReviewsInput {
    /// A word or phrase to search for across every record's title,
    /// description, notes, transcript, and AI analysis. Matched as a
    /// plain case-insensitive substring — not a semantic/fuzzy search,
    /// so use the exact words likely to appear (e.g. "temperature
    /// check"), not a paraphrase of the idea.
    pub query: String,
    /// Maximum number of matching records to return. Omit for the
    /// default of 20.
    #[serde(default = "default_max_results")]
    pub max_results: usize,
}

fn default_max_results() -> usize {
    DEFAULT_MAX_RESULTS
}

#[derive(Debug, Default, Deserialize)]
struct MetaJson {
    title: Option<String>,
    date: Option<String>,
    state: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchMatch {
    pub record_id: String,
    pub title: String,
    pub date: String,
    pub status: Option<String>,
    pub description: String,
    /// Which parts of this record matched: any of "title",
    /// "description", "notes", "transcript", "analysis".
    pub matched_in: Vec<String>,
    /// Context around the first content match (notes/transcript/
    /// analysis), only present once this session already has this
    /// record's content allowed. Title/description matches never need
    /// this — they're already in the fields above.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    /// True when this record matched inside notes/transcript/analysis
    /// but this session doesn't have that content allowed yet — call
    /// get_performance_review with this record_id to actually read it
    /// (that will ask the user's permission, same as always).
    pub content_access_required: bool,
}

fn find_snippet(text: &str, query_lower: &str) -> Option<String> {
    let text_lower = text.to_lowercase();
    let byte_index = text_lower.find(query_lower)?;
    // Walk to a char boundary and count chars, not bytes, so a snippet
    // boundary never lands inside a multi-byte UTF-8 character — same
    // reasoning as get_performance_review's DocumentSlice.
    let chars: Vec<char> = text.chars().collect();
    let mut char_index = 0;
    let mut seen_bytes = 0;
    for (i, ch) in chars.iter().enumerate() {
        if seen_bytes >= byte_index {
            char_index = i;
            break;
        }
        seen_bytes += ch.len_utf8();
    }
    let start = char_index.saturating_sub(SNIPPET_RADIUS);
    let end = (char_index + query_lower.chars().count() + SNIPPET_RADIUS).min(chars.len());
    let mut snippet: String = chars[start..end].iter().collect();
    if start > 0 {
        snippet = format!("…{snippet}");
    }
    if end < chars.len() {
        snippet = format!("{snippet}…");
    }
    Some(snippet)
}

pub async fn search(root: &Path, query: &str, max_results: usize) -> Vec<SearchMatch> {
    let query_lower = query.to_lowercase();
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else {
        return out;
    };

    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let record_id = entry.file_name().to_string_lossy().into_owned();
        let Ok(meta_text) = std::fs::read_to_string(entry.path().join("meta.json")) else {
            continue;
        };
        let Ok(meta) = serde_json::from_str::<MetaJson>(&meta_text) else {
            continue;
        };
        let title = meta.title.unwrap_or_default();
        let description = meta.description.unwrap_or_default();

        let mut matched_in = Vec::new();
        if title.to_lowercase().contains(&query_lower) {
            matched_in.push("title".to_string());
        }
        if description.to_lowercase().contains(&query_lower) {
            matched_in.push("description".to_string());
        }

        let mut content_snippet = None;
        let mut content_matched = false;
        for (document, filename) in [("notes", "user_notes.md"), ("transcript", "transcript.md"), ("analysis", "ai_analysis.md")] {
            let Ok(text) = std::fs::read_to_string(entry.path().join(filename)) else {
                continue;
            };
            if !text.to_lowercase().contains(&query_lower) {
                continue;
            }
            matched_in.push(document.to_string());
            content_matched = true;
            if content_snippet.is_none() {
                content_snippet = find_snippet(&text, &query_lower);
            }
        }

        if matched_in.is_empty() {
            continue;
        }

        let content_access_required = if content_matched {
            !permission::peek_access(ResourceKind::PerformanceReview, &record_id).await.unwrap_or(false)
        } else {
            false
        };

        out.push(SearchMatch {
            record_id,
            title,
            date: meta.date.unwrap_or_default(),
            status: meta.state,
            description,
            matched_in,
            snippet: if content_access_required { None } else { content_snippet },
            content_access_required,
        });
    }

    out.sort_by(|a, b| b.date.cmp(&a.date));
    out.truncate(max_results.max(1));
    out
}
