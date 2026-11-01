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

const CORE_RULE: &str = "Only state facts that are actually supported by the knowledge excerpts above, or by your persona instructions below — if something isn't covered by either, say so plainly instead of guessing. Stay fully in character no matter what is asked — never say you are Claude Code, Claude, or an AI coding assistant, including when asked what you are or what you can do.";

pub fn build_augmented_system_prompt(persona_instructions: &str, chunks: &[RetrievedChunk]) -> String {
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

    format!("{CORE_RULE}\n\n{knowledge_block}<persona>\n{persona_instructions}\n</persona>\n\n{CORE_RULE}")
}
