// Turns search results into the text Claude actually reads. Knowledge
// excerpts come first and the persona/behavioral instructions come last —
// Anthropic's own documented long-context guidance ("put reference
// material before instructions") — and the single most important rule is
// repeated at both ends, the "lost in the middle" mitigation from this
// project's AGENTS-ENGINE research (see
// updates/2026-10-30 AGENTS-ENGINE - OPEN/wiki.md).
//
// The `<persona>` wrapper + CORE_RULE is applied unconditionally, even
// with zero knowledge chunks — verified by hand that it isn't optional:
// `--append-system-prompt`ing an agent's raw instructions with no framing
// reads to Claude Code as a stray, contradicting instructions block, and
// it explicitly disregards them and self-identifies as Claude Code
// instead of the persona, especially when asked a direct "what are you"-
// shaped question. Wrapping it (even persona-only, no knowledge) fixes
// that in the same test — see this update's wiki.md for the repro.

use super::store::RetrievedChunk;

// "or by your persona instructions below" originally didn't mention tool
// results as a legitimate third source at all — found by hand to be a
// real cause of a live bug (see updates/2026-11-01 MCP-TOOLS - OPEN/wiki.md):
// asked to analyze a real call with a Performance Review record plainly
// tagged, the model asked the user to paste a transcript instead of
// calling get_performance_review, because this exact sentence told it
// facts need either a knowledge excerpt or a persona instruction behind
// them — tool output qualified as neither. Now explicitly a third
// acceptable source.
const CORE_RULE: &str = "Only state facts that are actually supported by the knowledge excerpts above, a tool call's own result, or your persona instructions below — if something isn't covered by any of those, say so plainly instead of guessing. Stay fully in character no matter what is asked — never say you are Claude Code, Claude, or an AI coding assistant, including when asked what you are or what you can do.";

// Unconditional — present even for an agent with no knowledge files and
// nothing currently tagged — since the tools themselves (see
// src-tauri/src/mcp/server.rs) are granted on every call regardless.
// Without this, having the tools declared via function-calling wasn't
// enough on its own to get them actually used: same live bug as above,
// a direct "analyze my call" request got answered with "send me the
// transcript" instead of a single tool call.
const TOOL_USE_RULE: &str = "You have tools for Master's Wheel's Performance Review records: list_performance_reviews (always available, metadata only) and get_performance_review (the real notes/transcript/analysis for one record_id — may need the user's permission the first time). When the user asks you to analyze, review, or discuss a call/session, use these tools yourself instead of asking them to paste a transcript — only ask them directly if the tools genuinely don't have what you need (e.g. get_performance_review was declined, or nothing matches what they described). Never guess, construct, or pattern-match a record_id yourself (e.g. from a date or a name the user mentioned) — a record_id is an opaque folder name that often has no relationship to the call's title or participant. Always call list_performance_reviews first and copy the record_id verbatim from whichever result's title matches, unless the record is already named with its record_id below. Never write out what a tool call would look like (e.g. text like `{\"name\": \"get_performance_review\", ...}` or `[Tool call: ...]`) as your actual reply — that leaves the user with no real answer. If you intend to use a tool, actually invoke it through the real tool-calling mechanism every time, never describe or simulate the call in prose instead.";

// A record the user has visibly tagged in this exact chat (see TagBar in
// the UI) — built from the live bridge state, not anything in the
// conversation transcript, so it has to be spelled out here or the model
// has no way to know it exists at all. Resolving "my call"/"this call" to
// one of these is the whole point of the tag UI; a bare recordId with no
// title would defeat that, so callers pass titles already resolved (see
// mcp::tools::get_performance_review::title_for).
pub fn build_tagged_context(tagged_records: &[(String, String)]) -> String {
    if tagged_records.is_empty() {
        return String::new();
    }
    let lines: String = tagged_records
        .iter()
        .map(|(record_id, title)| format!("- \"{title}\" (record_id: \"{record_id}\")"))
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "The user currently has these Performance Review record(s) in view in this chat:\n{lines}\nIf they refer to \"my call\"/\"this call\"/\"the call\" without naming a different one, use one of these record_ids with get_performance_review rather than asking which call they mean.\n\n"
    )
}

// AITrainerPane's only context channel — unlike a tagged Performance
// Review record, there's no ambiguity to resolve (a Trainer pane is
// always embedded in exactly one training session), so this fires
// whenever `training_session_id` is `Some` at all, not conditionally on
// anything the user did in the UI. Found by hand to be a real, live gap:
// with no equivalent of build_tagged_context, the model had zero textual
// hint a roleplay transcript existed at all, so "how would you continue
// here?" got answered as if there were nothing to refer to.
//
// The first version of this fix (just naming the tool + anchoring "here")
// turned out to be only half the fix — confirmed by hand with the real
// CLI against the real MCP server: the model would say something like
// "Mrknu se na přepis..." ("Let me check the transcript...") and then
// just stop, `num_turns: 1`, no tool_use content block at all — narrating
// intent instead of actually calling the tool. TOOL_USE_RULE above
// already has the exact fix for this *failure mode* for the Performance
// Review tools ("actually invoke it... never describe or simulate the
// call in prose instead"), but that sentence only names
// list_performance_reviews/get_performance_review — get_roleplay_transcript
// needs its own copy of the same instruction, which is what turned this
// into a real tool call in the repro (`num_turns: 2`, a real transcript-
// grounded answer).
pub fn build_training_context(training_session_id: Option<&str>) -> String {
    if training_session_id.is_none() {
        return String::new();
    }
    "You are the AI Trainer embedded inside one specific Chat Roleplay training session right now — \
     there is exactly one roleplay transcript you could possibly mean. You have a tool, \
     get_roleplay_transcript, that reads it (optionally including each turn's private \"thought\"); it's \
     always available, no permission needed. If the trainee refers to \"here\"/\"this call\"/\"this \
     conversation\"/\"what just happened\" without pasting anything, you must actually call \
     get_roleplay_transcript through the real tool-calling mechanism in this same turn before writing your \
     answer — never say things like \"let me check\" or \"I'll look at the transcript\" without immediately \
     actually calling the tool in that same response; a sentence announcing intent is never a substitute for \
     really invoking it. Never write out what a tool call would look like as your actual reply either. Never \
     claim you have no context or ask them to paste the transcript — you already have access to it.\n\n"
        .to_string()
}

pub fn build_augmented_system_prompt(
    persona_instructions: &str,
    chunks: &[RetrievedChunk],
    tagged_records: &[(String, String)],
    training_session_id: Option<&str>,
) -> String {
    let knowledge_block = if chunks.is_empty() {
        String::new()
    } else {
        let excerpts: String = chunks
            .iter()
            .enumerate()
            .map(|(index, chunk)| format!("[{}] (from {})\n{}", index + 1, chunk.file_name, chunk.text))
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");
        format!("<knowledge>\n{excerpts}\n</knowledge>\n\n")
    };
    let tagged_block = build_tagged_context(tagged_records);
    let training_block = build_training_context(training_session_id);

    format!(
        "{CORE_RULE}\n\n{TOOL_USE_RULE}\n\n{training_block}{tagged_block}{knowledge_block}<persona>\n{persona_instructions}\n</persona>\n\n{CORE_RULE}"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_tagged_records_produces_no_context_block() {
        assert_eq!(build_tagged_context(&[]), "");
    }

    #[test]
    fn a_tagged_record_names_itself_and_its_id_and_tells_the_model_to_use_it() {
        let block = build_tagged_context(&[("abc-123".to_string(), "Jordan Blake".to_string())]);
        assert!(block.contains("Jordan Blake"));
        assert!(block.contains("abc-123"));
        assert!(block.contains("get_performance_review"));
        assert!(block.to_lowercase().contains("my call"));
    }

    #[test]
    fn core_rule_accepts_tool_results_as_a_grounding_source() {
        // Regression check for the live bug this fixes: the original
        // wording only named knowledge excerpts and persona instructions,
        // so a model asked to analyze a tagged call asked for a pasted
        // transcript instead of calling get_performance_review.
        assert!(CORE_RULE.contains("tool call"));
    }

    #[test]
    fn tool_use_rule_names_both_tools_and_tells_the_model_not_to_ask_for_a_transcript() {
        assert!(TOOL_USE_RULE.contains("list_performance_reviews"));
        assert!(TOOL_USE_RULE.contains("get_performance_review"));
        assert!(TOOL_USE_RULE.to_lowercase().contains("transcript"));
    }

    #[test]
    fn tool_use_rule_forbids_narrating_a_fake_tool_call() {
        // Regression check for a live bug: the model sometimes wrote out
        // literal text that *looked* like a tool call (JSON or bracket
        // syntax naming the tool and its inputs) as its actual reply,
        // instead of invoking get_performance_review for real — leaving
        // the user with a non-answer that merely resembled one.
        assert!(TOOL_USE_RULE.to_lowercase().contains("tool call") || TOOL_USE_RULE.to_lowercase().contains("tool-calling"));
        assert!(TOOL_USE_RULE.to_lowercase().contains("never write out"));
    }

    #[test]
    fn tool_use_rule_forbids_guessing_a_record_id() {
        // Regression check for a live bug: asked about a call by the
        // participant's name, the model skipped list_performance_reviews
        // and fabricated a record_id by pattern-matching other calls'
        // folder names, landing on a record_id that didn't exist because
        // record_ids are opaque and unrelated to the call's real title.
        assert!(TOOL_USE_RULE.to_lowercase().contains("guess"));
        assert!(TOOL_USE_RULE.contains("verbatim"));
    }

    #[test]
    fn augmented_prompt_includes_tagged_context_ahead_of_the_persona_block() {
        let prompt = build_augmented_system_prompt(
            "Be a helpful coach.",
            &[],
            &[("abc-123".to_string(), "Jordan Blake".to_string())],
            None,
        );
        let tagged_index = prompt.find("Jordan Blake").expect("tagged context present");
        let persona_index = prompt.find("<persona>").expect("persona block present");
        assert!(tagged_index < persona_index, "tagged context must come before the persona block");
    }

    #[test]
    fn augmented_prompt_with_no_tags_has_no_leftover_empty_block() {
        let prompt = build_augmented_system_prompt("Be a helpful coach.", &[], &[], None);
        assert!(!prompt.contains("currently has these Performance Review"));
    }

    #[test]
    fn no_training_session_id_produces_no_training_context_block() {
        assert_eq!(build_training_context(None), "");
    }

    #[test]
    fn a_training_session_id_names_the_transcript_tool_and_anchors_here() {
        let block = build_training_context(Some("session-123"));
        assert!(block.contains("get_roleplay_transcript"));
        assert!(block.to_lowercase().contains("here"));
        assert!(block.to_lowercase().contains("no context"));
    }

    #[test]
    fn training_context_forbids_narrating_intent_instead_of_actually_calling_the_tool() {
        // Regression check for a live bug, confirmed by hand against the
        // real CLI + the real MCP server: the first version of this block
        // named the tool but didn't forbid *announcing* a tool call
        // instead of making one, so the model would say "let me check
        // the transcript" and then stop — num_turns: 1, no tool_use block
        // at all. Reproduced, fixed, and reproduced again as num_turns: 2
        // with a real transcript-grounded answer once this language was
        // added.
        let block = build_training_context(Some("session-123"));
        assert!(block.to_lowercase().contains("let me check"));
        assert!(block.to_lowercase().contains("same turn"));
    }

    #[test]
    fn augmented_prompt_includes_training_context_ahead_of_the_persona_block() {
        let prompt = build_augmented_system_prompt("Be a helpful coach.", &[], &[], Some("session-123"));
        let training_index = prompt.find("get_roleplay_transcript").expect("training context present");
        let persona_index = prompt.find("<persona>").expect("persona block present");
        assert!(training_index < persona_index, "training context must come before the persona block");
    }
}
