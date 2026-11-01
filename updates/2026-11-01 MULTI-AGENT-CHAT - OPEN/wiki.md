# Wiki — persona break: agents self-identifying as Claude Code

## Symptom
Live test (user): opened a dedicated chat with Lukas AI, sent
`@Eli Wilde what can you do`, then a plain `what can you do` (no mention,
so the dedicated agent — Lukas — should answer). Both replies broke
character and explained they were "Claude Code, a coding assistant,"
correctly naming the persona they were supposed to be ("Eli Wilde /
Wilde Influence", "Lukáš Vlach-style discovery") but refusing to actually
answer as it.

## Root cause, confirmed by direct repro against the raw CLI (outside the app)
`src-tauri/src/knowledge/prompt.rs`'s `build_augmented_system_prompt` only
wrapped the persona in `<persona>` tags + a "stay fully in character"
rule when there were retrieved knowledge chunks to go with it
(`chunks.is_empty()` early-returned the raw instructions, unwrapped).
Eli Wilde has zero knowledge files, so it always took that bare path.

Reproduced directly: `claude -p "what can you do" --append-system-prompt
"<Eli Wilde's raw instructions>"` → the model explicitly calls it "a
stray instructions block... I'm disregarding it" and answers as Claude
Code. Same instructions wrapped as
`CORE_RULE\n\n<persona>\n...\n</persona>\n\nCORE_RULE` → answers fully and
correctly in character, no mention of Claude Code at all.

Why: `--append-system-prompt` appends to Claude Code's own base system
prompt (deliberately, so baseline safety/tool framing stays intact — see
assistant.rs's comment on this) rather than replacing it. Unwrapped raw
persona text sitting next to a base prompt that says "you are Claude
Code" reads as a contradiction the model resolves in the base prompt's
favor, especially for a direct identity/capability question like "what
can you do" — exactly the question most likely to surface this. The
explicit "stay fully in character no matter what is asked" framing (now
strengthened to also say "never say you are Claude Code, Claude, or an
AI coding assistant") is what tips that resolution the other way.

A second path to the same bug existed in `assistant.rs`: a knowledge
retrieval error fell back to the bare `instructions.clone()` too — same
unwrapped-persona bug, just reachable even for an agent *with* knowledge
files if retrieval ever errors.

Likely compounding factor in this specific transcript: Lukas AI's
dispatch, as the first-ever reply in that session, received the full
shared transcript as context (see dispatch.ts's buildAgentTurnInput) —
which at that point already contained Eli Wilde's broken "I'm Claude
Code" reply, verbatim, as prior dialogue. That's a plausible primer
toward repeating the same framing. Not separately confirmed in isolation
since the primary fix (below) removes the broken reply that would have
caused it in the first place.

## Fix
`build_augmented_system_prompt` now always wraps in `<persona>` +
CORE_RULE, with or without knowledge chunks — only the `<knowledge>`
block itself is conditional. Both `assistant.rs` fallback paths
(retrieval error, no agent id) now call the same wrapping function with
an empty chunk list instead of using bare `instructions.clone()`, so
there is no remaining code path that sends an agent's persona unwrapped.

## Open question
Whether the "stay fully in character" framing holds up under more
adversarial or repeated identity probing than a single "what can you
do" — not tested beyond the one repro. If a persona break resurfaces
after this fix, suspect the CORE_RULE wording itself needs to be
stronger (e.g. an explicit few-shot example of correctly deflecting an
identity question) rather than the wrapper being missing again.
