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
const TOOL_USE_RULE: &str = "You have tools for Master's Wheel's Performance Review records: list_performance_reviews (always available, metadata only) and get_performance_review (the real notes/transcript/analysis for one record_id — may need the user's permission the first time). When the user asks you to analyze, review, or discuss a call/session, use these tools yourself instead of asking them to paste a transcript — only ask them directly if the tools genuinely don't have what you need (e.g. get_performance_review was declined, or nothing matches what they described).";

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

pub fn build_augmented_system_prompt(
    persona_instructions: &str,
    chunks: &[RetrievedChunk],
    tagged_records: &[(String, String)],
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

    format!(
        "{CORE_RULE}\n\n{TOOL_USE_RULE}\n\n{tagged_block}{knowledge_block}<persona>\n{persona_instructions}\n</persona>\n\n{CORE_RULE}"
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
    fn augmented_prompt_includes_tagged_context_ahead_of_the_persona_block() {
        let prompt = build_augmented_system_prompt(
            "Be a helpful coach.",
            &[],
            &[("abc-123".to_string(), "Jordan Blake".to_string())],
        );
        let tagged_index = prompt.find("Jordan Blake").expect("tagged context present");
        let persona_index = prompt.find("<persona>").expect("persona block present");
        assert!(tagged_index < persona_index, "tagged context must come before the persona block");
    }

    #[test]
    fn augmented_prompt_with_no_tags_has_no_leftover_empty_block() {
        let prompt = build_augmented_system_prompt("Be a helpful coach.", &[], &[]);
        assert!(!prompt.contains("currently has these Performance Review"));
    }
}
