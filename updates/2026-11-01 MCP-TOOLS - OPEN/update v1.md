# Update — MCP tools: standard + first capability (Performance Review visibility)

## Goal
Two bundled asks, dictated together:
1. A standing structure for adding MCP tools to the AI Assistant going
   forward — modular, one file/folder per concern, so each future tool is
   a small addition, not a rewrite.
2. The first real tool: the AI Assistant can "see" Performance Review
   records. Comes with a specific UX — a tag chip bar on top of the chat
   (per-record, "suggested" vs "active"), a standing
   `list_performance_reviews` lookup that's always available (metadata
   only — id/date/status/description, never gated), and a permission flow
   (Decline / Allow / Always Allow, inline in chat) for anything the AI
   wants to actually read that isn't already in scope via a tag.

This is AGENTS-ENGINE's Phase 3 ("Tool/MCP calling"), split into its own
update because the scope grew past "one phase" — same reasoning `CHAT-UX`
and `MULTI-AGENT-CHAT` were split out earlier. See
`updates/2026-10-30 AGENTS-ENGINE - OPEN/update v1.md`'s Phase 3 bullet
for the pointer back.

## Why this matters now
`assistant.rs` currently passes `--tools ""` and grants nothing via
`--permission-mode dontAsk` — every reply is pure text generation, found
specifically because even an empty allowlist still cost ~20k tokens/reply
in declared-but-unused tool schemas (see `main`'s commit `5f325a4`). Any
MCP work from here has to add back schema cost deliberately and narrowly
(exactly the tools actually wired), not undo that fix by accident.

## Decided with the user
Tags and "Always Allow" grants are scoped to **one chat session** —
switching chats (even with the same agent) starts with no tags; switching
back restores them exactly as left.

## Architecture
- The MCP server is a small **Rust binary** (`src-tauri/src/bin/mcp_server.rs`),
  not Node — `claude` itself needs Node, nothing else in this app does,
  and every other external integration here (`ffmpeg`, `curl`, `claude`)
  is a shelled-out *binary*, never an `npx`-resolved script. Uses the
  `rmcp` crate for the stdio JSON-RPC handshake.
- `assistant.rs` passes `--mcp-config <generated file> --strict-mcp-config`
  (only our server's tools are even considered) plus an explicit
  `--allowedTools` listing exactly the wired tools.
- A small local bridge (`src-tauri/src/mcp/bridge.rs`, a second
  `tiny_http` server next to `media_server.rs`'s) holds per-chat-session
  tag/permission state and brokers permission requests between the MCP
  subprocess and the real user (Tauri event out, blocks the HTTP response
  until the frontend answers or a timeout elapses).
- Record data is read straight from disk
  (`~/Documents/Master's Wheel/<id>/*`) — no proxying through Tauri, no
  second storage layer.
- The tool standard: `src-tauri/src/mcp/tools/`, one file per tool, each
  exporting name + model-facing description + input schema + execute fn;
  `tools/mod.rs` collects the list the server advertises.

Full design/file list recorded in the approved plan
(`/Users/stage/.claude/plans/glistening-cooking-pony.md`) — not duplicated
here; this doc tracks phase status as work lands.

## Phased roadmap

**Phase A — MCP foundation, proven with the safe tool only. Built.**
`src-tauri/src/mcp/` (`server.rs` using `rmcp` 3.8.0, `tools/
list_performance_reviews.rs`, `paths.rs`, `config.rs`). No separate bin
target in the end — the app re-execs its own binary with
`MASTERS_WHEEL_MCP_SERVER=1` (see `server.rs`'s doc comment and
`wiki.md`) instead, which avoids bundling/signing a second executable
into the packaged `.app`. `assistant.rs` now passes `--mcp-config
--strict-mcp-config --allowedTools mcp__masters_wheel__list_performance_reviews`
instead of the old `--tools ""`. Verified by hand end-to-end through the
real `claude` CLI, not just `cargo check` — see `wiki.md`.

**Phase B — Tag UI, no gating yet. Built.**
`src/lib/mcp/activeRecord.ts` (pub/sub store, `PerformanceReview.script.ts`
reports its `selectedId` into it), `src/lib/mcp/tags.ts` (pure tag-list
ops), `ChatSession.tags`/`alwaysAllowedRecordIds` persistence,
`TagBar`/`TagChip` elements rendered between the window header and the
chat. One deliberate deviation from the plan's literal description: the
"suggested" tag is **never written to `session.tags`/disk** — it's
computed at render time from `activeRecordId` (see
`AIAssistant.script.ts`'s `visibleTags`), not synced via an effect. An
effect that called `setState` in response to the external store tripped
`react-hooks/set-state-in-effect` and, more importantly, was solving a
problem render-time derivation already solves for free — only a real
"active" tag (Phase C: one the AI has actually read) ever gets stored.
Dismissing a suggested chip is tracked as a small per-session
"last-dismissed record id" in local state, not persisted. `cargo check`
unaffected (frontend-only phase); `tsc --noEmit`, `npm run lint`,
`npm run build` all clean; `npm run app:build` reinstalled.

**Phase C — `get_performance_review` + permission flow. Built.**
The gated tool (`mcp/tools/get_performance_review.rs`), the gating
decision as a pure, unit-tested method (`mcp/bridge.rs`'s
`SessionAccess::resolve` — 10 passing tests covering suggested/active/
always-allowed, cross-record isolation, and that `respond`/`sync_tags`
behave correctly), the bridge's `/permission-request` round trip with a
180s auto-decline timeout, `PermissionRequest` chat card (full card while
pending, collapses to one line once resolved), and tag promotion
(suggested → active) the moment a tagged record is actually read.
`assistant.rs` now always passes both tools via `--allowedTools`.
Verified by hand against the real `claude` CLI and the real bridge (not
just unit tests) — see `wiki.md`'s Phase C notes, including a full
~198s run of the complete ask → timeout → decline → model-relays-it path.
Not yet confirmed by the user's own click-through of the Decline/Allow/
Always Allow buttons themselves (browser/UI automation off-limits for
this project, per CLAUDE.md).

Each phase kept `cargo check`, `cargo test`, `tsc --noEmit`,
`npm run lint`, `npm run build` clean, and ended with `npm run app:build`
reinstalled to `/Applications/Master's Wheel.app`.

## Status
All three phases (A, B, C) built and reinstalled. The AI Assistant can
now list every Performance Review record (always, no gating), and read a
specific record's real notes/transcript/analysis once a tag covers it or
the user explicitly grants access through the new inline permission UI.

## Fix — tagged record was invisible to the model, found on first real use
First live try surfaced a real bug, not a UX nice-to-have: asked an
agent to analyze a call while a record was visibly tagged, it asked for
a transcript instead of using either tool. Root cause and fix recorded
in `wiki.md` — two gaps in `knowledge/prompt.rs`'s system-prompt
assembly (the tag was never actually described to the model, and the
original wording didn't list tool results as an acceptable basis for
stated facts), not anything wrong in the bridge/gating logic itself.
Fixed, covered by 6 new Rust unit tests (16 total now), and verified by
hand against the real CLI: given the fixed prompt, the model correctly
calls `get_performance_review` with the tagged record's real `record_id`
instead of asking for a transcript. Rebuilt and reinstalled.

## Fix — two more live bugs, same first real-use round
- **127k tokens for one reply**: `--tools ""` (controls the CLI's own
  built-in tool schema declaration — Bash/Edit/Read/Task/etc., unrelated
  to `--allowedTools`) got dropped when `--mcp-config` was added in Phase
  A, under the wrong assumption it was superseded. It wasn't — reproduced
  by hand (~30k vs ~10k tokens on a trivial call) and added back
  alongside the MCP flags, not instead of them. Verified MCP tool calling
  still works correctly with it present (confirmed by hand, faster if
  anything). See `wiki.md`.
- **"New chat" sometimes created two linked history entries**: the
  in-memory placeholder draft and a disk-loaded real session could end
  up sharing the literal id `"current"` across separate app launches —
  every update keyed by id then matched both at once. Fixed in
  `AIAssistant.script.ts`'s load-merge effect (regenerate the draft's id
  on collision instead of reusing it). Full trace in `wiki.md`.

Both fixed, `cargo check`/`cargo test` (16 tests)/`tsc --noEmit`/
`npm run lint`/`npm run build` clean, rebuilt and reinstalled.

## Fix — a real "stuck fetching forever" report, traced to "Allow" only ever covering one chunk
Live report (user): the assistant said something like "Fetching the call
transcript for [name]..." and then just never continued — and separately,
sometimes answered with raw technical-looking text instead of a real
analysis. Both traced to the same root cause, found by inspecting the
actual record involved (a 2-hour call, 154KB transcript — `get_performance_review`
pages text in 16,000-character chunks, so reading the whole thing takes
~10 separate tool calls) against `bridge.rs`'s gating code, not by
guessing: `Bridge::respond` only ever persisted `always_allowed` for the
`"always-allow"` decision — a plain `"allow"` just unblocked the *one*
in-flight HTTP call and left no trace anywhere. Every document crossing
one page triggered a brand-new, easy-to-miss permission card for the next
chunk of the *same* document the user had just said yes to, each capable
of silently eating another full 180s timeout before auto-declining. A
decline partway through a multi-chunk read is also the likely source of
the "technical language" replies — the model getting a clean result for
several chunks and then a sudden access-declined result for the next one.

**Fix**: `mcp/bridge.rs` gained a `TurnDecision` cache (`Allowed`/
`Declined`) scoped to one chat turn, keyed by resource — recorded the
moment a `/permission-request` resolves (real click or timeout) and
consulted before a resource's *next* request is even asked, so chunk 2
through N of the same document reuse chunk 1's decision instantly: no new
card, no repeat 180s wait. `Bridge::start_turn` clears this cache; wired
into `assistant.rs`'s `ask_agent` right before each `claude -p` spawn, so
the *next user message* still asks fresh — only "Always Allow" is meant
to survive across turns. Deliberately left `SessionAccess::resolve`/the
`/access` endpoint untouched (still used for the tag/always-allow fast
path with its own 10 existing tests) — the short-circuit lives entirely
inside `handle_permission_request`, the one place that was actually
missing it. 6 new Rust unit tests (24 total in this file, 52 overall),
`cargo check`/`tsc --noEmit` clean. Not separately hand-verified against
the real CLI with an actual oversized transcript (would need a genuine
~180s+ multi-chunk run) — the logic bug itself (confirmed by reading
`Bridge::respond` directly: `always_allowed` only grows on
`"always-allow"`, never `"allow"`) and its unit tests are the evidence
this was broken and is now fixed; rebuilt and reinstalled either way.

## Fix — the real root cause: the model announces intent, then just stops
Follow-up to the fix above. The user pushed back with a sharp observation
on the Miroslav Šustáček chat: a tag *was* visually pinned above the
composer when this happened, and the model clearly knew who "Miroslav
Šustáček" was without being told — proof a "suggested" tag (never
persisted, pure live reflection of whatever record's page is open —
see `activeTaggedResource.ts`) really was in effect when that turn's
system prompt got built. Traced via the real saved chat JSON
(`Closer/chats/2e0f3491-....json`): `tags: []` persisted (expected — a
suggested tag never persists), but `alwaysAllowedResources` only grew
during the *second* turn, and the single permission-request message in
the whole file appended only after the second turn's own placeholder —
meaning turn 1 ended with **no tool call, no permission request, no
error**, final text just the announcement
`"**Fetching the call transcript for Miroslav Šustáček...**"`. Caught a
second live instance of the identical shape in real time while writing
this up (a brand-new Tony Robbins chat: `"...let me pull the file."`,
turn complete, `claudeSessionIds` already written, zero permission
request, unchanged for 3.5+ minutes after) — ruling out a timeout/race
entirely: the turn wasn't blocked on anything, it simply ended.

**Real root cause**: this exact failure mode — a short "let me check
X..." narration with no actual `tool_use` block, `is_error: false`, a
"successful" reply that's really an unfulfilled promise — was already
found and fixed once before, for `get_roleplay_transcript`
(`knowledge/prompt.rs`'s `build_training_context`, see its own comment).
That fix's wording ("never say things like 'let me check'... without
immediately actually calling the tool in that same response — a
sentence announcing intent is never a substitute for really invoking
it") was never copied into `TOOL_USE_RULE`, the rule that actually
covers `get_performance_review`/`get_training_session` — the two tools
both live repros hit. `TOOL_USE_RULE` only banned *faking* a tool call's
syntax in prose, not plainly narrating intent and stopping — a real gap,
not a guess.

**Fix**: copied the proven sentence into `TOOL_USE_RULE`. One new Rust
test (`tool_use_rule_forbids_announcing_intent_without_actually_calling_the_tool`).
`cargo check`/`tsc --noEmit` clean.

Separately, while investigating, found and fixed a second real gap in
`mcp/bridge.rs`: a tag's gating check was evaluated *live* at the moment
of the tool call, not locked to whatever was tagged when the turn
started and the system prompt already promised the model it could read.
A long turn gives the user plenty of time to navigate away from a
record's page mid-turn, which re-fires the tag-sync effect and
*replaces* the session's live tags — dropping the very tag the prompt
relied on, right before the tool call that needed it. `Bridge::start_turn`
(already added for the pagination fix above) now also snapshots every
currently tagged/always-allowed resource as `TurnDecision::Allowed` the
instant a turn starts, so it survives any later tag-sync churn for the
rest of that turn. 2 new tests (47 total in this crate, up from 46).
Both real bugs, found from one user report, by reading the actual saved
chat logs rather than guessing — not yet re-verified against the real
CLI with a fresh record (would need a genuine multi-minute run);
rebuilt and reinstalled either way.

## Next
Try it for real: open the AI Assistant, go to Performance Review and open
a record (watch the dashed "suggested" tag appear above the chat), ask
the agent to analyze it (should now actually call the tool instead of
asking for a transcript), then ask about a *different*, untagged record
by name — a permission card should appear with Decline/Allow/Always
Allow. Try all three, and confirm switching chats starts with no tags
while switching back restores them. Still needs the user's own hands-on
confirmation of the UI itself (buttons, chip behavior, and that "New
chat" no longer duplicates) — not click-tested from this side.

Once confirmed, candidates for a future round (not started, not asked
for yet): more MCP tools following the same `mcp/tools/` pattern (e.g.
Agents, StatSpace/analytics), and persisting "Always Allow" grants a
little more visibly if that turns out to matter in practice.
