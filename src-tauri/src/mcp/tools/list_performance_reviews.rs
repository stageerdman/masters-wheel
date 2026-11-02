// Always-available, never-gated: just the metadata the user already sees
// in Performance Review's own record list (Navigation's VideoListItem),
// never the actual notes/transcript/analysis content. That's what makes
// it safe to let the model call unconditionally — see
// get_performance_review (Phase C) for the gated, real-content tool.

use serde::{Deserialize, Serialize};

use crate::mcp::paths::records_root;

#[derive(Debug, Serialize)]
pub struct ReviewSummary {
    pub record_id: String,
    pub title: String,
    pub date: String,
    /// One of "closed" | "training" | "postponed" | "failed" |
    /// "notQualified", or null if the record hasn't been classified yet —
    /// matches CALL_STATE_META in PerformanceReview.data.ts exactly.
    pub status: Option<String>,
    pub description: String,
}

// Deliberately tolerant, same as src/lib/records/index.ts's parseMeta: a
// missing/corrupt meta.json means "skip this record", never a crash.
#[derive(Debug, Default, Deserialize)]
struct MetaJson {
    title: Option<String>,
    date: Option<String>,
    state: Option<String>,
    description: Option<String>,
}

pub fn list() -> Vec<ReviewSummary> {
    let root = records_root();
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(&root) else {
        return out;
    };
    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let record_id = entry.file_name().to_string_lossy().into_owned();
        let Ok(text) = std::fs::read_to_string(entry.path().join("meta.json")) else {
            continue;
        };
        let Ok(meta) = serde_json::from_str::<MetaJson>(&text) else {
            continue;
        };
        out.push(ReviewSummary {
            record_id,
            title: meta.title.unwrap_or_default(),
            date: meta.date.clone().unwrap_or_default(),
            status: meta.state,
            description: meta.description.unwrap_or_default(),
        });
    }
    out.sort_by(|a, b| b.date.cmp(&a.date));
    out
}
