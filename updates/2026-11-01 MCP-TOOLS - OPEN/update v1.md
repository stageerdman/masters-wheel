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
