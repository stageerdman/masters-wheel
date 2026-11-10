// Real AI backend for the Chat Roleplay training discipline (see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/update v1.md`'s Phases 16-27).
//
// Deliberately NOT built on assistant.rs's `ask_agent`: that command exists
// for a user-facing `Agent` persona — knowledge retrieval, per-chat MCP
// tags/permissions, streaming. None of Chat Roleplay's internal AI roles
// (the scenario designer, the persona-builder, the prospect persona, a
// coach writing insight) are a user's own Agent, and none need knowledge
// files or gated record access (generate_persona reads records directly,
// main-process-side, with no permission gate — see its own doc comment).
// So this is a second, simpler module shelling out to `claude -p` the
// same way, blocking (`.output()`, like `assistant::name_chat`) rather
// than streamed — none of these replies are long enough for streaming to
// buy anything.
//
// Output format: plain labeled lines (`THOUGHT:` / `REPLY:`, `KIND:` /
// `TITLE:` / `NAME:` / ...), not JSON — see this update's wiki.md for the
// research + empirical verification behind that choice (unchanged since
// Phase 16). Every parse is defensive: a missing label never errors the
// turn, it falls back to a safe default or (for anything the trainee
// would otherwise never see at all) the whole raw response.

use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::claude_cli::run_claude;

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
Ask at most one short clarifying question at a time — never a long numbered list. You need: who the trainee is \
talking to in general terms (role/context — a full persona gets built separately once this is confirmed, so \
don't dig into personality here), the setting, the difficulty they want (easy/medium/hard), and the facts that \
are actually true about THIS call's circumstances (e.g. whether trust is already built, how the lead came in, \
whether the prospect already knows why they're on the call, how open or guarded they're likely coming in). Those \
circumstantial facts are the \"assumptions\" below — they describe the call, never the prospect's personality or \
communication style. Once you know enough, stop asking and propose.\n\n\
Output EXACTLY one of these two shapes, nothing before or after:\n\n\
KIND: question\n\
MESSAGE: <one short clarifying question>\n\n\
or\n\n\
KIND: proposal\n\
TITLE: <short scenario title>\n\
OBJECTIVE: <1-2 sentences: what the trainee is practicing and why it matters>\n\
DIFFICULTY: easy|medium|hard\n\
META: <one line: setting/channel only — never a persona name or personality>\n\
ASSUMPTIONS:\n\
- <first fact about this call's circumstances>\n\
- <second fact about this call's circumstances>\n\
- <third fact about this call's circumstances>\n\n\
Example:\n\
KIND: proposal\n\
TITLE: Cold Call — Price Objection Recovery\n\
OBJECTIVE: Practicing staying composed and asking clarifying questions when a prospect pushes back on price, \
instead of immediately discounting.\n\
DIFFICULTY: hard\n\
META: Outbound cold call, no prior contact.\n\
ASSUMPTIONS:\n\
- You're already past the gatekeeper — this skips the switchboard.\n\
- No prior outreach has happened — this is first contact.\n\
- The prospect hasn't filled out any form — they don't know why you're calling yet."
    )
}

#[derive(Serialize)]
pub struct ProposalFields {
    pub title: String,
    pub objective: String,
    pub difficulty: String,
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
// sees *something*, never a silently dropped reply. A missing
// `DIFFICULTY:` defaults to "medium" rather than failing the whole
// proposal over one optional-feeling label.
fn parse_setup_reply(text: &str, session_id: String) -> SetupReply {
    let kind = extract_label(text, "KIND").unwrap_or_default();
    if kind == "proposal" {
        let title = extract_label(text, "TITLE").unwrap_or_default();
        let objective = extract_label(text, "OBJECTIVE").unwrap_or_default();
        let difficulty = extract_label(text, "DIFFICULTY").unwrap_or_else(|| "medium".to_string());
        let meta = extract_label(text, "META").unwrap_or_default();
        let assumptions = extract_bullets_after(text, "ASSUMPTIONS");
        if !title.is_empty() && !assumptions.is_empty() {
            return SetupReply {
                kind: "proposal".to_string(),
                message: None,
                proposal: Some(ProposalFields { title, objective, difficulty, meta, assumptions }),
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
        let (result, session_id) = run_claude(&system_prompt, &message, resume_session_id.as_deref(), None, None)?;
        Ok(parse_setup_reply(&result, session_id))
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

// Who the persona is and how they communicate — built once by
// generate_persona, optionally mutated by generate_session_adjustment,
// never shown to the trainee. `camelCase` on the wire to match
// ChatRoleplaySession.data.ts's `Persona` type exactly (this struct
// crosses the Rust/TS boundary as a plain argument/return value, not
// through #[tauri::command]'s own arg-name convention, so it needs its
// own rename).
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PersonaFields {
    pub name: String,
    pub background: String,
    pub response_length: String,
    pub emotional_openness: String,
    pub language_style: String,
    pub limiting_beliefs: Vec<String>,
    pub source_record_id: Option<String>,
}

// Parses a persona-builder (or session-adjustment) response's NAME:/
// BACKGROUND:/RESPONSE_LENGTH:/EMOTIONAL_OPENNESS:/LANGUAGE_STYLE:/
// LIMITING_BELIEFS: labels. Enum-shaped fields fall back to a safe
// default rather than passing through a stray value — RESPONSE_LENGTH
// defaults to "mixed", EMOTIONAL_OPENNESS to "moderate", same spirit as
// every other defensive parse in this module. `source_record_id` is
// never set here — callers that know it (generate_persona) set it
// themselves afterward.
fn parse_persona_fields(text: &str) -> PersonaFields {
    let response_length = match extract_label(text, "RESPONSE_LENGTH").as_deref() {
        Some("short") => "short",
        Some("long") => "long",
        _ => "mixed",
    }
    .to_string();
    let emotional_openness = match extract_label(text, "EMOTIONAL_OPENNESS").as_deref() {
        Some("guarded") => "guarded",
        Some("open") => "open",
        _ => "moderate",
    }
    .to_string();
    let limiting_beliefs = extract_label(text, "LIMITING_BELIEFS")
        .map(|raw| raw.split('|').map(|belief| belief.trim().to_string()).filter(|belief| !belief.is_empty()).collect())
        .unwrap_or_default();
    PersonaFields {
        name: extract_label(text, "NAME").unwrap_or_else(|| "Unnamed".to_string()),
        background: extract_label(text, "BACKGROUND").unwrap_or_default(),
        response_length,
        emotional_openness,
        language_style: extract_label(text, "LANGUAGE_STYLE").unwrap_or_default(),
        limiting_beliefs,
        source_record_id: None,
    }
}

const PERSONA_BUILDER_HEADER: &str = "You build a hidden persona profile for a sales-roleplay AI. The trainee will \
never see this directly — they only ever talk to the persona itself, never read this profile. Ground it in real \
behavior when given a real transcript below; otherwise invent something realistic and internally consistent.";

fn build_persona_system_prompt(source_block: &str, objective: &str, difficulty: &str) -> String {
    format!(
        "{PERSONA_BUILDER_HEADER}\n\n\
{source_block}\n\n\
Training objective: {objective}\n\
Difficulty: {difficulty}\n\n\
Extract (or invent, staying consistent with the difficulty) a persona covering:\n\
- Name and background/situation: why they're on this call, what's going on for them.\n\
- Response length: do they tend to answer short and closed, or long and open?\n\
- Emotional openness: how easily do they share feelings — guarded, moderate, or open?\n\
- Language style: word choice, pacing, anything distinctive about how they talk.\n\
- Limiting beliefs: beliefs they hold about this situation that hold them back — some they're aware of, some \
they might not be. Mark ones they likely aren't aware of with \"(unaware)\".\n\n\
Output EXACTLY this format, nothing before or after:\n\
NAME: <name>\n\
BACKGROUND: <1-3 sentences>\n\
RESPONSE_LENGTH: short|long|mixed\n\
EMOTIONAL_OPENNESS: guarded|moderate|open\n\
LANGUAGE_STYLE: <short phrase>\n\
LIMITING_BELIEFS: <belief one> | <belief two> | <belief three, mark \"(unaware)\" if applicable>\n\n\
Example:\n\
NAME: Marcus Webb\n\
BACKGROUND: IT Director at a mid-size firm, burned by an overpromising vendor last year, now the one who has to \
justify any new spend to his own boss.\n\
RESPONSE_LENGTH: short\n\
EMOTIONAL_OPENNESS: guarded\n\
LANGUAGE_STYLE: Clipped, technical, tests claims with specific numbers before engaging further.\n\
LIMITING_BELIEFS: All vendors overpromise and underdeliver | Admitting a past bad decision makes him look \
incompetent (unaware) | Price is always the real objection, even when it isn't"
    )
}

const TRANSCRIPT_EXCERPT_CHARS: usize = 6_000;

fn has_real_transcript(records_root: &Path, record_id: &str) -> bool {
    std::fs::read_to_string(records_root.join(record_id).join("transcript.md"))
        .map(|text| !text.trim().is_empty())
        .unwrap_or(false)
}

// Picks a real past Performance Review call to ground the persona in —
// a "failed" (lost) call for a hard scenario, a "closed" (won) call
// otherwise — read directly off disk, main-process-side (this command
// has a real AppHandle, unlike the MCP subprocess's tools), with no
// permission gate at all: unlike get_performance_review, this never
// hands the trainee anything from that record, it only ever reads a
// transcript excerpt into an internal persona-building prompt.
#[tauri::command]
pub async fn generate_persona(
    app: tauri::AppHandle,
    active_space_folder: String,
    objective: String,
    difficulty: String,
) -> Result<PersonaFields, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<PersonaFields, String> {
        let records_root = crate::spaces::records_dir(&app, &active_space_folder)?;
        let wanted_state = if difficulty == "hard" { "failed" } else { "closed" };
        let reviews = crate::mcp::tools::list_performance_reviews::list(&records_root);
        let source = reviews
            .iter()
            .find(|review| review.status.as_deref() == Some(wanted_state) && has_real_transcript(&records_root, &review.record_id));

        let (source_block, source_record_id) = match source {
            Some(review) => {
                let text = std::fs::read_to_string(records_root.join(&review.record_id).join("transcript.md")).unwrap_or_default();
                let excerpt: String = text.chars().take(TRANSCRIPT_EXCERPT_CHARS).collect();
                (
                    format!(
                        "Here is a real past call's transcript to ground this persona in — extract their actual \
patterns, don't invent generic ones:\n\n{excerpt}"
                    ),
                    Some(review.record_id.clone()),
                )
            }
            None => (
                "No real past call transcript was available to ground this in — invent a plausible, realistic \
persona consistent with the objective and difficulty below instead (don't claim or imply this is based on a \
real call)."
                    .to_string(),
                None,
            ),
        };

        let system_prompt = build_persona_system_prompt(&source_block, &objective, &difficulty);
        let (result, _session_id) = run_claude(&system_prompt, "Build the persona now.", None, None, None)?;
        let mut fields = parse_persona_fields(&result);
        fields.source_record_id = source_record_id;
        Ok(fields)
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

fn build_roleplay_system_prompt(persona: &PersonaFields, call_assumptions: &[String], adjustment_phrase: Option<&str>) -> String {
    let name = &persona.name;
    let assumptions_block = if call_assumptions.is_empty() {
        String::new()
    } else {
        call_assumptions.iter().map(|a| format!("- {a}")).collect::<Vec<_>>().join("\n")
    };
    let beliefs_block = if persona.limiting_beliefs.is_empty() {
        "none identified".to_string()
    } else {
        persona.limiting_beliefs.join("; ")
    };
    let adjustment_block = adjustment_phrase
        .filter(|phrase| !phrase.trim().is_empty())
        .map(|phrase| {
            format!("\n\nCarried-forward note from the trainee's last session (apply it naturally through how {name} behaves, don't mention it): {phrase}")
        })
        .unwrap_or_default();

    format!(
        "You are playing {name} in a sales-roleplay call. Stay fully in character at all times, no matter what \
the trainee says or asks.\n\n\
Who {name} is: {background}\n\
How {name} communicates: tends to respond {response_length} (short/closed vs long/open); emotional openness is \
{emotional_openness}; language style: {language_style}.\n\
{name}'s limiting beliefs: {beliefs_block}.\n\n\
Facts about THIS call (not about {name} personally):\n\
{assumptions_block}{adjustment_block}\n\n\
For every trainee message, follow this exact two-step process:\n\
1. Reason as a META-ANALYST, not as {name}'s own inner voice — in third person, predict how {name} would most \
likely respond right now and what they'd probably feel, specifically because of the communication pattern or \
limiting belief above that's driving it. This is YOUR analysis of {name}, not {name} thinking privately. It is \
never seen by the trainee and must not leak into the reply — the reply must stand alone, as if this analysis \
step never happened.\n\
2. Let that analysis decide tone/length/warmth, then write only the line {name} would actually say out loud.\n\n\
Output EXACTLY this format, nothing before or after:\n\
THOUGHT: <your third-person meta-analysis of how/why {name} would respond this way, 1-3 sentences>\n\
REPLY: <the spoken line only>\n\n\
Example:\n\
THOUGHT: Marcus has a short, guarded response pattern and a belief that all vendors overpromise — being asked \
for specifics without first being told why will likely trigger more guardedness, not less, so he'll probably \
stay terse and testing rather than engage.\n\
REPLY: *(pause)* ...Half? Which companies. I've heard that pitch before and it didn't hold up.",
        background = persona.background,
        response_length = persona.response_length,
        emotional_openness = persona.emotional_openness,
        language_style = persona.language_style,
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
    persona: PersonaFields,
    call_assumptions: Vec<String>,
    adjustment_phrase: Option<String>,
    resume_session_id: Option<String>,
) -> Result<RoleplayTurnReply, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<RoleplayTurnReply, String> {
        let system_prompt = build_roleplay_system_prompt(&persona, &call_assumptions, adjustment_phrase.as_deref());
        let prompt_text = message.unwrap_or_else(|| OPENING_SCENE_MESSAGE.to_string());
        let (result, session_id) = run_claude(&system_prompt, &prompt_text, resume_session_id.as_deref(), None, None)?;
        Ok(parse_roleplay_turn(&result, session_id))
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

// What "Next Session" actually asks for now: not just a flavor phrase,
// but a real decision about whether the persona itself should shift to
// target what the trainee needs to practice next (see this update's
// wiki.md — the user explicitly asked for this: "AI can try to adjust
// difficulty or refocus the person's characteristics... in order to
// focus on what user must practice right now").
#[derive(Serialize)]
pub struct SessionAdjustment {
    pub phrase: String,
    pub persona: PersonaFields,
}

fn build_adjustment_system_prompt(objective: &str, persona: &PersonaFields) -> String {
    let beliefs = if persona.limiting_beliefs.is_empty() { "none identified".to_string() } else { persona.limiting_beliefs.join("; ") };
    format!(
        "You are a sales coach deciding how to adjust the next practice round. Given the transcript below and the \
training objective, decide two things: (1) one short, concrete, actionable phrase for the trainee — what to try \
differently next time — and (2) whether to adjust the persona's difficulty or characteristics to better target \
what the trainee needs to practice next (e.g. make them more guarded if the trainee needs practice drawing people \
out, more talkative if the trainee needs practice staying concise, or shift which limiting belief is most in \
play). Only change what's actually useful — most fields should usually stay exactly as given below.\n\n\
Training objective: {objective}\n\n\
Current persona:\n\
NAME: {name}\n\
BACKGROUND: {background}\n\
RESPONSE_LENGTH: {response_length}\n\
EMOTIONAL_OPENNESS: {emotional_openness}\n\
LANGUAGE_STYLE: {language_style}\n\
LIMITING_BELIEFS: {beliefs}\n\n\
The transcript to read follows as the next message. Output EXACTLY this format, nothing before or after:\n\
PHRASE: <one short actionable phrase for the trainee>\n\
NAME: <persona name, usually unchanged>\n\
BACKGROUND: <usually unchanged>\n\
RESPONSE_LENGTH: short|long|mixed\n\
EMOTIONAL_OPENNESS: guarded|moderate|open\n\
LANGUAGE_STYLE: <phrase>\n\
LIMITING_BELIEFS: <belief one> | <belief two> | ...",
        name = persona.name,
        background = persona.background,
        response_length = persona.response_length,
        emotional_openness = persona.emotional_openness,
        language_style = persona.language_style,
    )
}

#[tauri::command]
pub async fn generate_session_adjustment(transcript_text: String, objective: String, persona: PersonaFields) -> Result<SessionAdjustment, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<SessionAdjustment, String> {
        let system_prompt = build_adjustment_system_prompt(&objective, &persona);
        let (result, _session_id) = run_claude(&system_prompt, &transcript_text, None, None, None)?;
        let phrase = extract_label(&result, "PHRASE").unwrap_or_default();
        let mut next_persona = parse_persona_fields(&result);
        next_persona.source_record_id = persona.source_record_id.clone();
        Ok(SessionAdjustment { phrase, persona: next_persona })
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

// One shared command for every "coach writes something about a finished
// round or whole session" call that doesn't involve the persona — a
// round report or the cross-session final report. Each `kind` gets its
// own system prompt; the output is plain text, trimmed, no labels.
fn build_insight_system_prompt(kind: &str) -> Result<&'static str, String> {
    match kind {
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
        let (result, _session_id) = run_claude(system_prompt, &input_text, None, None, None)?;
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
        let text = "KIND: proposal\nTITLE: Cold Call\nOBJECTIVE: Practice staying calm\nDIFFICULTY: hard\nMETA: Outbound\nASSUMPTIONS:\n- First fact\n- Second fact";
        let reply = parse_setup_reply(text, "sess-1".to_string());
        assert_eq!(reply.kind, "proposal");
        let proposal = reply.proposal.expect("proposal present");
        assert_eq!(proposal.title, "Cold Call");
        assert_eq!(proposal.objective, "Practice staying calm");
        assert_eq!(proposal.difficulty, "hard");
        assert_eq!(proposal.meta, "Outbound");
        assert_eq!(proposal.assumptions, vec!["First fact".to_string(), "Second fact".to_string()]);
    }

    #[test]
    fn a_missing_difficulty_label_defaults_to_medium_rather_than_failing_the_proposal() {
        let text = "KIND: proposal\nTITLE: Cold Call\nOBJECTIVE: Practice staying calm\nMETA: Outbound\nASSUMPTIONS:\n- First fact";
        let reply = parse_setup_reply(text, "sess-1".to_string());
        let proposal = reply.proposal.expect("proposal present");
        assert_eq!(proposal.difficulty, "medium");
    }

    #[test]
    fn a_malformed_proposal_missing_assumptions_falls_back_to_a_question() {
        let text = "KIND: proposal\nTITLE: Cold Call\nMETA: Outbound";
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

    #[test]
    fn parses_a_clean_persona() {
        let text = "NAME: Marcus\nBACKGROUND: IT Director\nRESPONSE_LENGTH: short\nEMOTIONAL_OPENNESS: guarded\nLANGUAGE_STYLE: clipped\nLIMITING_BELIEFS: belief one | belief two (unaware)";
        let persona = parse_persona_fields(text);
        assert_eq!(persona.name, "Marcus");
        assert_eq!(persona.background, "IT Director");
        assert_eq!(persona.response_length, "short");
        assert_eq!(persona.emotional_openness, "guarded");
        assert_eq!(persona.language_style, "clipped");
        assert_eq!(persona.limiting_beliefs, vec!["belief one".to_string(), "belief two (unaware)".to_string()]);
        assert_eq!(persona.source_record_id, None);
    }

    #[test]
    fn persona_enum_fields_fall_back_to_safe_defaults_when_unrecognized() {
        let persona = parse_persona_fields("NAME: X\nRESPONSE_LENGTH: garbled\nEMOTIONAL_OPENNESS: garbled");
        assert_eq!(persona.response_length, "mixed");
        assert_eq!(persona.emotional_openness, "moderate");
    }

    #[test]
    fn missing_name_falls_back_to_unnamed_rather_than_an_empty_string() {
        let persona = parse_persona_fields("BACKGROUND: someone");
        assert_eq!(persona.name, "Unnamed");
    }
}
