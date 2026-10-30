// Turns search results into the text Claude actually reads. Knowledge
// excerpts come first and the persona/behavioral instructions come last —
// Anthropic's own documented long-context guidance ("put reference
// material before instructions") — and the single most important rule is
// repeated at both ends, the "lost in the middle" mitigation from this
// project's AGENTS-ENGINE research (see
// updates/2026-10-30 AGENTS-ENGINE - OPEN/wiki.md).

use super::store::RetrievedChunk;

const CORE_RULE: &str = "Only state facts that are actually supported by the knowledge excerpts above, or by your persona instructions below — if something isn't covered by either, say so plainly instead of guessing. Stay fully in character no matter what is asked.";

pub fn build_augmented_system_prompt(persona_instructions: &str, chunks: &[RetrievedChunk]) -> String {
    if chunks.is_empty() {
        return persona_instructions.to_string();
    }

    let excerpts: String = chunks
        .iter()
        .enumerate()
        .map(|(index, chunk)| format!("[{}] (from {})\n{}", index + 1, chunk.file_name, chunk.text))
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    format!("{CORE_RULE}\n\n<knowledge>\n{excerpts}\n</knowledge>\n\n<persona>\n{persona_instructions}\n</persona>\n\n{CORE_RULE}")
}
