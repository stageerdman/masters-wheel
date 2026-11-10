// Content search across every Performance Review record — finds a
// phrase inside a transcript/notes/question-analysis, not just title/description
// (that's what list_performance_reviews is for). Always returns a real
// snippet for a content match — nothing here is gated (see
// mcp/permission.rs's doc comment for why the old per-record access
// prompt was removed).

use std::path::Path;

use serde::{Deserialize, Serialize};

const DEFAULT_MAX_RESULTS: usize = 20;
// Characters of context kept on each side of a content match — enough to
// read the surrounding exchange without hauling in the whole document.
const SNIPPET_RADIUS: usize = 160;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct SearchPerformanceReviewsInput {
    /// A word or phrase to search for across every record's title,
    /// description, notes, transcript, and extracted question analysis.
    /// Matched as a plain case-insensitive substring — not a semantic/
    /// fuzzy search, so use the exact words likely to appear (e.g.
    /// "temperature check"), not a paraphrase of the idea.
    pub query: String,
    /// Maximum number of matching records to return. Omit for the
    /// default of 20.
    #[serde(default = "default_max_results")]
    pub max_results: usize,
}

fn default_max_results() -> usize {
    DEFAULT_MAX_RESULTS
}

// Minimal deserialize-only mirror of get_performance_review::QuestionAnswerPair
// — this tool only ever flattens pairs into searchable text, never
// returns them, so it doesn't need that module's Serialize derive.
#[derive(Debug, Deserialize)]
struct QuestionAnswerPair {
    question: String,
    answer: String,
}

#[derive(Debug, Deserialize)]
struct QuestionAnalysisFile {
    pairs: Vec<QuestionAnswerPair>,
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
    /// "description", "notes", "transcript", "questions".
    pub matched_in: Vec<String>,
    /// Context around the first content match (notes/transcript/
    /// questions). Title/description matches never need this — they're
    /// already in the fields above.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
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

pub fn search(root: &Path, query: &str, max_results: usize) -> Vec<SearchMatch> {
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
        for (document, filename) in [("notes", "user_notes.md"), ("transcript", "transcript.md")] {
            let Ok(text) = std::fs::read_to_string(entry.path().join(filename)) else {
                continue;
            };
            if !text.to_lowercase().contains(&query_lower) {
                continue;
            }
            matched_in.push(document.to_string());
            if content_snippet.is_none() {
                content_snippet = find_snippet(&text, &query_lower);
            }
        }

        // Question analysis isn't raw prose like notes/transcript — it's
        // a JSON list of clean question/answer pairs (see
        // get_performance_review.rs's QuestionAnswerPair) — so search it
        // by flattening each pair into one line of searchable text rather
        // than matching against the raw JSON (which would also match
        // field-name noise like `"timestamp_seconds"`).
        if let Ok(questions_text) = std::fs::read_to_string(entry.path().join("question_analysis.json")) {
            if let Ok(parsed) = serde_json::from_str::<QuestionAnalysisFile>(&questions_text) {
                let flattened = parsed
                    .pairs
                    .iter()
                    .map(|pair| format!("{}\n{}", pair.question, pair.answer))
                    .collect::<Vec<_>>()
                    .join("\n");
                if flattened.to_lowercase().contains(&query_lower) {
                    matched_in.push("questions".to_string());
                    if content_snippet.is_none() {
                        content_snippet = find_snippet(&flattened, &query_lower);
                    }
                }
            }
        }

        if matched_in.is_empty() {
            continue;
        }

        out.push(SearchMatch {
            record_id,
            title,
            date: meta.date.unwrap_or_default(),
            status: meta.state,
            description,
            matched_in,
            snippet: content_snippet,
        });
    }

    out.sort_by(|a, b| b.date.cmp(&a.date));
    out.truncate(max_results.max(1));
    out
}
