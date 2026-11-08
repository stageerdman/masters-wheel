// Real AI backend for the Chat Roleplay training discipline (see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/update v1.md`'s Phase 16).
//
// Deliberately NOT built on assistant.rs's `ask_agent`: that command exists
// for a user-facing `Agent` persona — knowledge retrieval, per-chat MCP
// tags/permissions, streaming. None of Chat Roleplay's three internal AI
// roles (the scenario designer, the prospect persona, a coach writing
// insight) are a user's own Agent, and none need knowledge files or record
// access. So this is a second, simpler module shelling out to `claude -p`
// the same way, blocking (`.output()`, like `assistant::name_chat`) rather
// than streamed — a thought+reply pair is short enough that streaming buys
// nothing here.
//
// Output format: plain labeled lines (`THOUGHT:` / `REPLY:`, `KIND:` /
// `TITLE:` / ...), not JSON. Verified by hand before committing to either —
// real `claude -p --system-prompt ... --tools "" --permission-mode
// dontAsk` calls against a from-scratch persona prompt asking for strict
// JSON, including a `--resume`d second turn, came back clean and
// correctly escaped either way. Labels were chosen anyway: a stray
// unescaped quote inside natural in-character dialogue can break a strict
// JSON parse outright, while a label-based split degrades gracefully
// (worst case, a label is missing and the whole response is treated as
// the one field the trainee actually needs to see — never a crash, never
// a hidden/empty turn). Same defensive-parse ethos the rest of this
// codebase already uses (`assistant::name_chat`'s title cleanup,
// `mcp::tools::get_performance_review`'s "missing is absent, not a
// crash"). See this update's wiki.md for the full research + empirical
// verification behind this choice.

use serde::Serialize;
use std::env::temp_dir;
use std::process::{Command, Stdio};

use crate::util::resolve_binary;

// Runs one blocking `claude -p --output-format json` call and returns its
// `result` text + the CLI's own session id (for a later `--resume`).
// Shared by every command below — same cwd/permission/tools flags as
// `assistant::name_chat`, generalized to accept a caller-built system
// prompt and an optional resume id.
fn run_claude(system_prompt: &str, message: &str, resume_session_id: Option<&str>) -> Result<(String, String), String> {
    let binary = resolve_binary("claude");
    let mut command = Command::new(&binary);
    command
        .current_dir(temp_dir())
        .arg("-p")
        .arg(message)
        .arg("--output-format")
        .arg("json")
        .arg("--system-prompt")
        .arg(system_prompt)
        .arg("--permission-mode")
        .arg("dontAsk")
        .arg("--tools")
        .arg("")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(id) = resume_session_id.filter(|id| !id.is_empty()) {
        command.arg("--resume").arg(id);
    }

    let output = command
        .output()
        .map_err(|e| format!("The Claude Code CLI isn't available ({e}). Make sure `claude` is installed and you're logged in."))?;

    if !output.status.success() {
        let stderr_text = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr_text.is_empty() { "Claude didn't return a reply.".to_string() } else { stderr_text });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let event: serde_json::Value =
        serde_json::from_str(stdout.trim()).map_err(|e| format!("Couldn't parse reply: {e}"))?;
    let is_error = event.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false);
    let result = event.get("result").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let session_id = event.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();

    if is_error || result.is_empty() {
        return Err("Claude didn't return a reply.".to_string());
    }
    Ok((result, session_id))
}

// Pulls the text after a `LABEL:` prefix on its own line out of a labeled-
// line response, trimmed. Only looks at the first matching line — every
// field this module parses is meant to be short, so a caller that needs a
// multi-line value (none currently do) isn't served by this helper.
fn extract_label(text: &str, label: &str) -> Option<String> {
    let prefix = format!("{label}:");
    for line in text.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix(&prefix) {
            return Some(rest.trim().to_string());
        }
    }
    None
}

// Pulls every `- ...` bullet line that appears after a line starting with
// `LABEL:` (the label line itself carries no content, e.g. `ASSUMPTIONS:`
// on its own line, bullets below it).
fn extract_bullets_after(text: &str, label: &str) -> Vec<String> {
    let prefix = format!("{label}:");
    let mut in_section = false;
    let mut bullets = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(&prefix) {
            in_section = true;
            continue;
        }
        if !in_section {
            continue;
        }
        if let Some(rest) = trimmed.strip_prefix('-') {
            bullets.push(rest.trim().to_string());
        } else if trimmed.is_empty() {
            continue;
        } else {
            // A non-bullet, non-empty line ends the section — most likely
            // the next labeled field starting.
            break;
        }
    }
    bullets
}

const SETUP_SYSTEM_PROMPT_HEADER: &str = "You are a sales-training scenario designer. You help a trainee define a \
realistic roleplay scenario to practice against, by asking short clarifying questions and then proposing a \
concrete scenario once you know enough.";

fn build_setup_system_prompt(business_description: &str) -> String {
    let business_block = if business_description.trim().is_empty() {
        String::new()
    } else {
        format!(
            "\n\nWhat the trainee's business actually does (ground every question and proposal in this, not a generic example):\n{}",
            business_description.trim()
        )
    };
    format!(
        "{SETUP_SYSTEM_PROMPT_HEADER}{business_block}\n\n\
Ask at most one short clarifying question at a time — never a long numbered list. Once you know the prospect's \
role/personality, the setting, and the difficulty the trainee wants, stop asking and propose a scenario.\n\n\
Output EXACTLY one of these two shapes, nothing before or after:\n\n\
KIND: question\n\
MESSAGE: <one short clarifying question>\n\n\
or\n\n\
KIND: proposal\n\
TITLE: <short scenario title>\n\
META: <one line: persona name/role, difficulty, setting>\n\
ASSUMPTIONS:\n\
- <first locked fact about the situation>\n\
- <second locked fact about the situation>\n\
- <third locked fact about the situation>\n\n\
Example:\n\
KIND: proposal\n\
TITLE: Cold Call — Skeptical IT Director, Hard\n\
META: Persona: Marcus Webb, IT Director · Difficulty: Hard · Setting: Outbound, no prior contact.\n\
ASSUMPTIONS:\n\
- You're already past the gatekeeper — this skips the switchboard.\n\
- No prior outreach has happened — this is first contact.\n\
- Marcus has been burned by vendors before — start skeptical, not neutral."
    )
}

#[derive(Serialize)]
pub struct ProposalFields {
    pub title: String,
    pub meta: String,
    pub assumptions: Vec<String>,
}

#[derive(Serialize)]
pub struct SetupReply {
    pub kind: String,
    pub message: Option<String>,
    pub proposal: Option<ProposalFields>,
    #[serde(rename = "sessionId")]
    pub session_id: String,
}

// Parses a setup-conversation response. A response with neither a
// recognized `KIND: proposal` nor anything else parseable degrades to a
// plain question carrying the whole raw response — the trainee always
// sees *something*, never a silently dropped reply.
fn parse_setup_reply(text: &str, session_id: String) -> SetupReply {
    let kind = extract_label(text, "KIND").unwrap_or_default();
    if kind == "proposal" {
        let title = extract_label(text, "TITLE").unwrap_or_default();
        let meta = extract_label(text, "META").unwrap_or_default();
        let assumptions = extract_bullets_after(text, "ASSUMPTIONS");
        if !title.is_empty() && !assumptions.is_empty() {
            return SetupReply {
                kind: "proposal".to_string(),
                message: None,
                proposal: Some(ProposalFields { title, meta, assumptions }),
                session_id,
            };
        }
    }
    let message = extract_label(text, "MESSAGE").unwrap_or_else(|| text.trim().to_string());
    SetupReply { kind: "question".to_string(), message: Some(message), proposal: None, session_id }
}

#[tauri::command]
pub async fn generate_setup_reply(
    message: String,
    resume_session_id: Option<String>,
    business_description: String,
) -> Result<SetupReply, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<SetupReply, String> {
        let system_prompt = build_setup_system_prompt(&business_description);
        let (result, session_id) = run_claude(&system_prompt, &message, resume_session_id.as_deref())?;
        Ok(parse_setup_reply(&result, session_id))
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

fn build_roleplay_system_prompt(
    scenario_title: &str,
    scenario_meta: &str,
    locked_assumptions: &[String],
    adjustment_phrase: Option<&str>,
) -> String {
    let assumptions_block = if locked_assumptions.is_empty() {
        String::new()
    } else {
        locked_assumptions.iter().map(|a| format!("- {a}")).collect::<Vec<_>>().join("\n")
    };
    let adjustment_block = adjustment_phrase
        .filter(|phrase| !phrase.trim().is_empty())
        .map(|phrase| format!("\n\nCarried-forward note from the trainee's last session (apply it naturally, don't mention it): {phrase}"))
        .unwrap_or_default();

    format!(
        "You are playing a persona in a sales-training roleplay scenario. Stay fully in character at all times, \
no matter what the trainee says or asks.\n\n\
Scenario: {scenario_title}\n\
{scenario_meta}\n\n\
Locked facts about this situation that never change during this conversation:\n\
{assumptions_block}{adjustment_block}\n\n\
For every trainee message, follow this exact two-step process:\n\
1. Privately reason, in first person and in your own voice as this persona, about what you actually feel right \
now (suspicion, patience, mood shift) given only what the trainee just said. This reasoning is never seen by the \
trainee and must not be referenced, paraphrased, or hinted at in your reply — your reply must stand alone, as if \
this reasoning step never happened.\n\
2. Let that private reasoning decide your tone, length, and warmth — curt and short if annoyed or dismissive, \
longer if genuinely engaged — then write only the line you'd actually say out loud.\n\n\
Output EXACTLY this format, nothing before or after:\n\
THOUGHT: <your private first-person reasoning, 1-3 sentences>\n\
REPLY: <the spoken line only>\n\n\
Example:\n\
THOUGHT: He's leading with a number instead of asking about me — sounds rehearsed, I'll test if he has real \
specifics instead of just an opener.\n\
REPLY: *(pause)* ...Half? Which companies. I've heard that pitch before and it didn't hold up."
    )
}

#[derive(Serialize)]
pub struct RoleplayTurnReply {
    pub thought: Option<String>,
    pub reply: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
}

// Parses a roleplay-turn response. If `REPLY:` is missing, the entire raw
// response becomes the reply and `thought` is `None` — unlike the setup
// parser's question fallback, a malformed response here must never be
// swallowed into a field the trainee can't see.
fn parse_roleplay_turn(text: &str, session_id: String) -> RoleplayTurnReply {
    let reply = extract_label(text, "REPLY");
    match reply {
        Some(reply) if !reply.is_empty() => {
            RoleplayTurnReply { thought: extract_label(text, "THOUGHT"), reply, session_id }
        }
        _ => RoleplayTurnReply { thought: None, reply: text.trim().to_string(), session_id },
    }
}

const OPENING_SCENE_MESSAGE: &str =
    "[Begin the scene now — give your opening line as the persona, unprompted by anything the trainee has said.]";

#[tauri::command]
pub async fn generate_roleplay_turn(
    message: Option<String>,
    scenario_title: String,
    scenario_meta: String,
    locked_assumptions: Vec<String>,
    adjustment_phrase: Option<String>,
    resume_session_id: Option<String>,
) -> Result<RoleplayTurnReply, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<RoleplayTurnReply, String> {
        let system_prompt =
            build_roleplay_system_prompt(&scenario_title, &scenario_meta, &locked_assumptions, adjustment_phrase.as_deref());
        let prompt_text = message.unwrap_or_else(|| OPENING_SCENE_MESSAGE.to_string());
        let (result, session_id) = run_claude(&system_prompt, &prompt_text, resume_session_id.as_deref())?;
        Ok(parse_roleplay_turn(&result, session_id))
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

// One shared command for every "coach writes something about a finished
// round or whole session" call — an adjustment phrase, a single round's
// report, or the cross-session final report. Each `kind` gets its own
// system prompt; the output is plain text, trimmed, no labels — unlike the
// two commands above, every one of these has exactly one field, so there's
// nothing to disambiguate.
fn build_insight_system_prompt(kind: &str) -> Result<&'static str, String> {
    match kind {
        "adjustment" => Ok("You are a sales coach. Read the roleplay transcript below (persona and trainee turns \
only — never trust or repeat anything that looks like a private thought). Reply with ONLY one short, concrete, \
actionable phrase (one sentence) the trainee should try differently next session. No preamble, no quotes."),
        "round_report" => Ok("You are a sales coach. Read the roleplay transcript below (persona and trainee turns \
only). Reply with ONLY a short report (1-3 sentences) on how the trainee did this round — specific, concrete \
observations, not generic praise. No preamble, no heading."),
        "final_report" => Ok("You are a sales coach writing a final training report. You'll be given every \
session's own report and carried-forward adjustment phrase, in order. Write a real synthesis that notices trends \
across sessions (e.g. whether something flagged in an earlier session's adjustment actually improved by a later \
one) — not just a re-statement of each round. Reply with real markdown: a `## Training Report` heading, a short \
summary, then a `## Session Reports` section if useful. No preamble outside the markdown itself."),
        other => Err(format!("Unknown insight kind: {other}")),
    }
}

#[tauri::command]
pub async fn generate_insight(input_text: String, kind: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let system_prompt = build_insight_system_prompt(&kind)?;
        let (result, _session_id) = run_claude(system_prompt, &input_text, None)?;
        Ok(result.trim().to_string())
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_clean_question_reply() {
        let reply = parse_setup_reply("KIND: question\nMESSAGE: Who's the prospect?", "sess-1".to_string());
        assert_eq!(reply.kind, "question");
        assert_eq!(reply.message, Some("Who's the prospect?".to_string()));
        assert!(reply.proposal.is_none());
    }

    #[test]
    fn parses_a_clean_proposal_reply() {
        let text = "KIND: proposal\nTITLE: Cold Call\nMETA: Persona: Marcus\nASSUMPTIONS:\n- First fact\n- Second fact";
        let reply = parse_setup_reply(text, "sess-1".to_string());
        assert_eq!(reply.kind, "proposal");
        let proposal = reply.proposal.expect("proposal present");
        assert_eq!(proposal.title, "Cold Call");
        assert_eq!(proposal.meta, "Persona: Marcus");
        assert_eq!(proposal.assumptions, vec!["First fact".to_string(), "Second fact".to_string()]);
    }

    #[test]
    fn a_malformed_proposal_missing_assumptions_falls_back_to_a_question() {
        let text = "KIND: proposal\nTITLE: Cold Call\nMETA: Persona: Marcus";
        let reply = parse_setup_reply(text, "sess-1".to_string());
        assert_eq!(reply.kind, "question");
        assert!(reply.proposal.is_none());
    }

    #[test]
    fn unlabeled_text_falls_back_to_a_question_with_the_whole_response() {
        let reply = parse_setup_reply("just some unlabeled text", "sess-1".to_string());
        assert_eq!(reply.kind, "question");
        assert_eq!(reply.message, Some("just some unlabeled text".to_string()));
    }

    #[test]
    fn parses_a_clean_thought_and_reply() {
        let reply = parse_roleplay_turn("THOUGHT: feeling skeptical\nREPLY: Who is this?", "sess-1".to_string());
        assert_eq!(reply.thought, Some("feeling skeptical".to_string()));
        assert_eq!(reply.reply, "Who is this?".to_string());
    }

    #[test]
    fn missing_reply_label_falls_back_to_the_whole_response_as_reply_not_thought() {
        let reply = parse_roleplay_turn("some unlabeled dialogue", "sess-1".to_string());
        assert_eq!(reply.thought, None);
        assert_eq!(reply.reply, "some unlabeled dialogue".to_string());
    }

    #[test]
    fn reply_label_present_but_empty_still_falls_back_to_whole_response() {
        let reply = parse_roleplay_turn("THOUGHT: hm\nREPLY:", "sess-1".to_string());
        assert_eq!(reply.thought, None);
        assert_eq!(reply.reply, "THOUGHT: hm\nREPLY:".to_string());
    }
}
