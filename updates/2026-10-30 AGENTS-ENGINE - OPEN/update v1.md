# Update — Agents engine (real AI behind Agents + AI Assistant)

## Goal
Wire a real Claude/Anthropic-powered backend behind the two existing
UI-shell features: `Agents` (custom instructions + knowledge files,
GPT-builder-style) and `AIAssistant` (chat, with multiple agents
@mentioned/dragged into one thread). Capabilities to land: custom
instructions per agent, knowledge grounding, tool/MCP calling (e.g.
Notion), and real multi-agent replies in one conversation.

## Status: Phase 1 prototype built, streaming fix built
Research came first, per the user's ask (findings in `wiki.md`). The one
blocking decision got resolved directly by the user (see below), and Phase
1 is now built and installed to `/Applications/Master's Wheel.app`.

## Blocking decision — resolved
**Where does the engine run?** Neither of the two options originally
weighed (Rust calling the Anthropic API directly, or a hosted Node
endpoint) — the user wants **their own already-authenticated local Claude
Code CLI**, invoked headlessly in the background, not a pay-per-token API
key. Implemented as `src-tauri/src/assistant.rs`: a Tauri command that
shells out to `claude -p` the same way `transcribe.rs` already shells out
to `ffmpeg`/`curl`. See `wiki.md` for the verified CLI mechanics (including
a real bug found by hand: `--bare` breaks auth in this environment; fixed
by running the subprocess from a neutral temp directory instead).

## Proposed phased roadmap (not yet started)

**Phase 1 — Single agent, real reply. Built.**
`AIAssistant`'s chat now gets a real reply instead of the old "no AI reply
yet": `sendMessage` calls the new `askAgent` (`src/lib/assistant/askAgent.ts`
→ `ask_agent` Tauri command) with the single active agent's `instructions`
as the persona (or a generic default voice when 0 or 2+ agents are active —
real multi-agent replies are Phase 2, not this one). Session continuity
works via a `claudeSessionId` stored per `ChatSession`, resumed each turn.
Composer disables itself while a reply is in flight. The 3 roster agents
(Researcher/Coach/Scheduler) got real `instructions` text added to their
fixtures. **Not included**: knowledge-file grounding (Tier-0, still
Phase 1.5 below) and tool/MCP calling (Phase 3) — this slice is
persona-only, no file access, no tools at all (`--permission-mode dontAsk`
with nothing allow-listed). No tests added yet — this is still fixture-
backed UI-adjacent glue rather than the kind of standalone logic CLAUDE.md
asks to lock in with tests; revisit once knowledge/tool logic lands.

**Phase 1 fix — real streaming, no more frozen UI. Built.**
Trying Phase 1 live surfaced a real bug, not a UX nice-to-have: the app
visibly froze (macOS beachball) for the whole multi-second reply, then the
full answer appeared all at once. Root cause: `ask_agent` was a plain
synchronous Tauri command blocking on `Command::output()` — it blocked
Tauri's main thread for the entire round-trip, unlike `transcribe.rs`'s
`generate_transcript` which deliberately runs as `async fn` +
`spawn_blocking` + progress events for exactly this reason. Fixed by
bringing `ask_agent` in line with that precedent: it's now `async`, does its
blocking subprocess work inside `spawn_blocking`, and switches the CLI call
from `--output-format json` to `--output-format stream-json
--include-partial-messages --verbose` (verified by hand: emits one NDJSON
line per event, including `content_block_delta` text chunks). Each delta is
forwarded immediately as an `ask-agent-progress` Tauri event; the trailing
`result` event's text/session_id stays authoritative for the stored message,
same fields the old single-blob `json` format exposed. The frontend
(`AIAssistant.script.ts`'s `sendMessage`) appends an empty assistant
placeholder the instant a message is sent — `Message.tsx` renders an empty
assistant bubble as a 3-dot "thinking" indicator — then grows that message's
text live as deltas arrive. No cancel/stop affordance was added (not asked
for, and collapsing the window already doesn't interrupt the reply — the
chat state lives in `AIAssistant.tsx`'s `useAIAssistant()`, which stays
mounted across collapse/reopen regardless of this change). Verified:
`cargo check`, `tsc --noEmit`, `npm run build` all clean; `npm run app:build`
rebuilt and reinstalled to `/Applications/Master's Wheel.app`. Not yet
confirmed by the user's own click-through (browser automation is off-limits
for this project).

**Phase 1.5 — Knowledge files (Tier 0), not yet built.**
Wire a `CoachAgent`'s `knowledgeFiles` into the same call via `--add-dir`
(let Claude's own Read/Grep/Glob tools read them directly, per the CLI
research — not yet hand-verified end-to-end). Resolves open decision #2/#3
in `wiki.md`.

**Phase 2 — Multi-agent, one thread.**
Extend to `activeAgentIds`/@mentions: parallel calls per mentioned agent
against the shared, speaker-labeled transcript, as scoped in `wiki.md`.
No moderator/selector.

**Phase 3 — Tool/MCP calling.**
Add the MCP Connector path for one real external capability (Notion is
the dictated example) plus the custom-tool hand-rolled loop for one
app-local capability, to prove both paths work from wherever the engine
ended up living.

**Phase 4 — Revisit knowledge tier.**
Only if a real agent's knowledge set outgrows Tier-0 stuffing: add Tier-1
keyword search, then Tier-2 embeddings/vector search in-process
(`sqlite-vec` or flat on-disk), per `wiki.md`'s escalation criteria. Not
scheduled unless a concrete need shows up.

Each phase ends with tests covering the logic that phase actually adds
(prompt assembly, multi-agent dispatch, tool-result handling) — per
CLAUDE.md, no tests for UI-shell-only work, but this update is exactly the
point where "real logic lands" starts applying.

## Decided
- Research-first, per explicit user instruction — no prototype built in
  this round yet.
- Tier-0 (full-context stuffing + prompt caching) is the right knowledge
  architecture to start with; no embeddings/vector DB until a concrete
  agent's corpus outgrows it.
- Multi-agent v1 is explicit-mention-only with parallel calls and a fully
  shared transcript — no moderator/selector.
- Anthropic's MCP Connector (beta) is the preferred path for external
  tools like Notion, specifically because it stays plain-JSON/HTTPS and
  works regardless of which side of the blocking decision above gets
  picked.

## Next
Try it: open `/Applications/Master's Wheel.app` (freshly rebuilt and
reinstalled with the streaming fix), open the AI Assistant, drag/@mention
one agent (e.g. Coach) into a chat, and send a message — the window should
stay fully responsive (draggable/collapsible) while a "thinking" dot
indicator appears immediately, then the reply types itself in live rather
than appearing all at once. Not yet verified by actually clicking through
the live UI (browser automation is off-limits for this project; `cargo
check`/`tsc --noEmit`/`npm run build` all pass and the CLI's streaming
output shape was verified by hand) — this needs the user's own click-through
to confirm end to end. Then decide whether to continue to Phase 1.5
(knowledge files) or Phase 2 (multi-agent).
