# Update — Agents engine (real AI behind Agents + AI Assistant)

## Goal
Wire a real Claude/Anthropic-powered backend behind the two existing
UI-shell features: `Agents` (custom instructions + knowledge files,
GPT-builder-style) and `AIAssistant` (chat, with multiple agents
@mentioned/dragged into one thread). Capabilities to land: custom
instructions per agent, knowledge grounding, tool/MCP calling (e.g.
Notion), and real multi-agent replies in one conversation.

## Status: Phase 1 + streaming fix + Phase 1.5 (real agents, real RAG) built
Research came first, per the user's ask (findings in `wiki.md`). The one
blocking decision got resolved directly by the user (see below). Phase 1,
the streaming fix, and Phase 1.5 are all built and installed to
`/Applications/Master's Wheel.app`.

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

**Phase 1.5 — Real agents, real knowledge, real RAG. Built.**
The Phase 1.5 research above (per-agent `CLAUDE.md` + cwd) was scoped for
"a handful of small files per agent" and got superseded before being
built: the user's real next agent is a single ~1000-page compiled corpus
(a public figure's full body of work), which breaks that scale assumption
outright — `--add-dir`/grep-based file access gives keyword matching, not
the semantic matching a corpus that size needs, and naive full-context
stuffing wouldn't fit a context window at all. This is exactly the
Tier-2 escalation `wiki.md`'s original research flagged as "only if a
concrete agent's corpus outgrows Tier 0" — now a real, not hypothetical,
need. See `wiki.md`'s newest section for the full reasoning (including
why ChatGPT's GPT knowledge feature handles this better than Claude
Projects today — GPTs actually run retrieval; Projects just stuffs
context).

Built, end to end:
- **Agents are real and persisted.** `src/lib/agents` replaces every
  fixture: one folder per agent under the app's own data directory
  (`agent.json` + `versions.json`), survives a reload. `AgentNav`'s
  "Add new agent" and `AgentEditor`'s Save now write to disk for real.
- **Knowledge files are real.** Picked via the native file dialog
  (`.txt`/`.md`/`.pdf` — `.xlsx` and others are rejected with a clear
  error rather than silently mishandled), copied into the agent's own
  folder.
- **Real Tier-2 RAG, fully local.** `src-tauri/src/knowledge/` (one file
  per concern: `extract` → `chunk` → `embedder` → `store` → `prompt` →
  `commands`) extracts each file's text, splits it into ~1500-character
  overlapping chunks, embeds every chunk on-device via `fastembed`
  (`AllMiniLML6V2`, 384-dim, no network call, no API key — matches the
  "local CLI, not a pay-per-token key" decision above), and stores
  chunks + vectors in a per-agent SQLite database via the `sqlite-vec`
  extension. Before every reply, `assistant.rs` embeds the user's message
  and retrieves the 8 most relevant chunks, which `knowledge::prompt`
  weaves into that turn's `--append-system-prompt` ahead of the persona
  instructions (knowledge first, persona last, core rule repeated at both
  ends — same placement research as the superseded Phase 1.5 plan, just
  applied to retrieved chunks instead of a whole document). Context cost
  per turn is now bounded by `top_k`, not by how large the underlying
  knowledge base is — a 1000-page corpus costs the same per-reply as a
  10-page one.
- **No default/generic assistant persona.** `AIAssistant.script.ts`
  dropped `DEFAULT_INSTRUCTIONS` entirely; `sendMessage` now requires
  exactly one real agent active in the chat or it blocks sending with an
  inline system message — explicit user ask ("there even shouldn't be
  any default AI, just the agents").
- **The Agents builder and the AI Assistant's chat roster are unified**
  into the one `Agent` type in `src/lib/agents` — resolves open decision
  #4 below. A real fix fell out of this for free: dedicated "Chat with
  X" sessions (via clicking an agent) previously never actually marked
  that agent as active for persona purposes, since `session.agentId` and
  `session.activeAgentIds` were checked inconsistently — `AIAssistant.script.ts`'s
  `resolveActiveAgents` now checks both.

Verified: `cargo check`, `tsc --noEmit`, `npm run lint`, `npm run build`
all clean; `npm run app:build` rebuilt and reinstalled to
`/Applications/Master's Wheel.app`. Not yet confirmed by the user's own
click-through (browser automation is off-limits for this project).

**Phase 2 — Multi-agent, one thread.**
Extend to `activeAgentIds`/@mentions: parallel calls per mentioned agent
against the shared, speaker-labeled transcript, as scoped in `wiki.md`.
No moderator/selector.

**Phase 3 — Tool/MCP calling. Split into its own update.**
Scope grew past one phase once the user dictated a concrete first
capability (Performance Review visibility) with its own tag/permission
UX — moved to
`updates/2026-11-01 MCP-TOOLS - OPEN/update v1.md`, same split already
done for `CHAT-UX` and `MULTI-AGENT-CHAT`. Superseded here: the engine
being the local Claude Code CLI (not the Anthropic Messages API) means
the real path is the CLI's own native `--mcp-config`/`--allowedTools`,
not the Anthropic-API-specific "MCP Connector" sketched below.

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
- ~~Tier-0 (full-context stuffing + prompt caching) is the right knowledge
  architecture to start with; no embeddings/vector DB until a concrete
  agent's corpus outgrows it.~~ **Superseded in Phase 1.5**: the user's
  real next agent (a ~1000-page corpus) is exactly the "corpus outgrows
  Tier 0" case this bullet already anticipated — built real Tier-2 local
  embeddings + vector search (`fastembed` + `sqlite-vec`) instead. Small
  agents could still use Tier 0/1 in principle; Phase 1.5 only built
  Tier 2, since every real agent so far needs it.
- No default/generic assistant persona — exactly one real agent must be
  active to send a message (explicit user ask, Phase 1.5).
- The `Agents` builder and the AI Assistant's chat roster share one real
  `Agent` type now — resolves open decision #4 below (explicit user ask,
  Phase 1.5).
- Multi-agent v1 is explicit-mention-only with parallel calls and a fully
  shared transcript — no moderator/selector.
- Anthropic's MCP Connector (beta) is the preferred path for external
  tools like Notion, specifically because it stays plain-JSON/HTTPS and
  works regardless of which side of the blocking decision above gets
  picked.

## Next
Try it: open `/Applications/Master's Wheel.app` (freshly rebuilt and
reinstalled with Phase 1.5). On the Agents page, create an agent, give it
instructions, and add a real knowledge file (`.txt`/`.md`/`.pdf`) — it
should show a real indexed chunk count once added (the first file ever
added in a fresh install also downloads the local embedding model, so
that one will take longer). Then open the AI Assistant, drag/click/
@mention that same agent into a chat, and ask it something the knowledge
file actually covers — the reply should be grounded in it, not just
generic. Sending with 0 or 2+ agents active should block with an inline
message instead of replying generically. Not yet verified by actually
clicking through the live UI (browser automation is off-limits for this
project; `cargo check`/`tsc --noEmit`/`npm run lint`/`npm run build` all
pass) — this needs the user's own click-through to confirm end to end,
especially retrieval quality once a real large (e.g. ~1000-page) corpus
is loaded. Then decide whether to continue to Phase 2 (multi-agent) or
Phase 3 (tool/MCP calling).
