// Always-available, never-gated: just the metadata the user already sees
// in Training Room's own session list (Navigation's SessionListItem),
// never the real notes/transcript content. Mirrors
// list_performance_reviews.rs exactly — see get_training_session for the
// gated, real-content tool.

use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct TrainingSessionSummary {
    pub session_id: String,
    pub name: String,
    /// One of "voiceTraining" | "chatRoleplay" | "voiceRoleplay" |
    /// "mindsetShifting" | "learning" — matches TOOL_TYPE_META's keys in
    /// TrainingRoom.data.ts exactly.
    pub tool_type: String,
    /// "open" | "closed".
    pub status: String,
    pub last_updated_at: String,
}

// Deliberately tolerant, same as src/lib/training/index.ts's parseMeta: a
// missing/corrupt session.json means "skip this session", never a crash.
#[derive(Debug, Default, Deserialize)]
struct SessionJson {
    name: Option<String>,
    #[serde(rename = "toolType")]
    tool_type: Option<String>,
    status: Option<String>,
    #[serde(rename = "lastUpdatedAt")]
    last_updated_at: Option<String>,
}

// `root` is resolved differently depending on the caller: the MCP
// subprocess has no AppHandle, so mcp/server.rs passes
// mcp::paths::training_root() (env-var based); a main-process caller
// would pass spaces::training_dir(...) directly instead (same split
// list_performance_reviews::list() already documents).
pub fn list(root: &Path) -> Vec<TrainingSessionSummary> {
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else {
        return out;
    };
    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let session_id = entry.file_name().to_string_lossy().into_owned();
        let Ok(text) = std::fs::read_to_string(entry.path().join("session.json")) else {
            continue;
        };
        let Ok(meta) = serde_json::from_str::<SessionJson>(&text) else {
            continue;
        };
        out.push(TrainingSessionSummary {
            session_id,
            name: meta.name.unwrap_or_default(),
            tool_type: meta.tool_type.unwrap_or_default(),
            status: meta.status.unwrap_or_default(),
            last_updated_at: meta.last_updated_at.unwrap_or_default(),
        });
    }
    out.sort_by(|a, b| b.last_updated_at.cmp(&a.last_updated_at));
    out
}
