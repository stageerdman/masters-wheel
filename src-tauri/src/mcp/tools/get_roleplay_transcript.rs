// The AI Trainer's only tool: real access to the roleplay transcript of
// the one training session it's embedded in. Deliberately ungated —
// unlike get_performance_review, there's no "which record" ambiguity for
// a permission card to resolve (a Trainer pane is already, structurally,
// scoped to exactly one training session — see mcp/server.rs and
// mcp/config.rs::TRAINING_ALLOWED_TOOLS for how this tool only ever gets
// declared on that one call).
//
// Reads session.json directly — the same file src/lib/training's
// writeSessionMeta writes, whose `roleplay` field this module has no
// typed model of on either side of the Rust/TS boundary (src/lib/training
// stores it opaquely; this just walks the raw JSON by the same camelCase
// field names ChatRoleplaySession.data.ts's RoleplayState uses).
//
// `with_thoughts` is unrelated to the "a trainee's private thought never
// reaches the roleplay AI" guarantee (roleplay.rs's generate_roleplay_turn
// signature enforces that one) — this is the Trainer AI optionally seeing
// thoughts in order to coach on them, a different reader entirely.

use serde::{Deserialize, Serialize};

use crate::mcp::paths::training_session_path;

const DEFAULT_LIMIT: usize = 16_000;

fn default_limit() -> usize {
    DEFAULT_LIMIT
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GetRoleplayTranscriptInput {
    /// Which round/session number to read. Omit for the latest (current,
    /// possibly still-live) round.
    pub round_number: Option<u32>,
    /// Include each turn's private "thought" alongside its spoken line.
    /// Defaults to false — the dialogue only.
    #[serde(default)]
    pub with_thoughts: bool,
    /// Character offset to start reading from. If the response's
    /// `has_more` is true, call again with offset = that response's own
    /// `offset + content.length` to keep reading.
    #[serde(default)]
    pub offset: usize,
    /// Max characters to return this call.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

#[derive(Debug, Serialize)]
pub struct RoleplayTranscriptContent {
    pub scenario_title: String,
    pub round_number: u32,
    pub is_live_round: bool,
    pub content: String,
    pub offset: usize,
    pub total_length: usize,
    pub has_more: bool,
}

fn render_turn(turn: &serde_json::Value, with_thoughts: bool) -> String {
    let speaker = match turn.get("speaker").and_then(|v| v.as_str()) {
        Some("persona") => "Persona",
        _ => "Trainee",
    };
    let text = turn.get("text").and_then(|v| v.as_str()).unwrap_or("");
    let mut line = format!("{speaker}: {text}");
    if with_thoughts {
        if let Some(thought_text) = turn.get("thought").and_then(|t| t.get("text")).and_then(|v| v.as_str()) {
            line.push_str(&format!("\n  (thought: {thought_text})"));
        }
    }
    line
}

// Char-indexed pagination, same shape as get_performance_review's
// DocumentSlice — a chunk boundary must never land inside a multi-byte
// UTF-8 character.
fn paginate(text: &str, offset: usize, limit: usize) -> (String, usize, usize, bool) {
    let total_length = text.chars().count();
    let start = offset.min(total_length);
    let end = start.saturating_add(limit).min(total_length);
    let content = text.chars().skip(start).take(end - start).collect();
    (content, start, total_length, end < total_length)
}

pub fn read(input: &GetRoleplayTranscriptInput) -> Result<RoleplayTranscriptContent, String> {
    let Some(session_path) = training_session_path() else {
        return Err(
            "This tool is only available from the AI Trainer pane inside a training session.".to_string(),
        );
    };
    let session_json_path = session_path.join("session.json");
    let text = std::fs::read_to_string(&session_json_path)
        .map_err(|e| format!("Couldn't read this training session: {e}"))?;
    let session: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Couldn't parse this training session: {e}"))?;

    let roleplay = session.get("roleplay").filter(|v| !v.is_null());
    let Some(roleplay) = roleplay else {
        return Err("This training session hasn't started a roleplay yet.".to_string());
    };
    let scenario_title = roleplay.get("scenarioTitle").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let rounds = roleplay.get("rounds").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    if rounds.is_empty() {
        return Err("This training session hasn't started a roleplay yet.".to_string());
    }

    let live_round_number = rounds
        .last()
        .and_then(|round| round.get("roundNumber"))
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as u32;
    let target_round_number = input.round_number.unwrap_or(live_round_number);

    let Some(round) = rounds
        .iter()
        .find(|round| round.get("roundNumber").and_then(|v| v.as_u64()) == Some(target_round_number as u64))
    else {
        return Err(format!("There's no Session {target_round_number} in this training session."));
    };

    let turns = round.get("turns").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let transcript_text =
        turns.iter().map(|turn| render_turn(turn, input.with_thoughts)).collect::<Vec<_>>().join("\n");

    let (content, offset, total_length, has_more) = paginate(&transcript_text, input.offset, input.limit);
    Ok(RoleplayTranscriptContent {
        scenario_title,
        round_number: target_round_number,
        is_live_round: target_round_number == live_round_number,
        content,
        offset,
        total_length,
        has_more,
    })
}
