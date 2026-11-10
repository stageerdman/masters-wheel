# Update v2 — content search across Performance Review records

## Goal
Two things the user asked for together:
1. A way for the AI to find calls by *what's actually said in them*
   (e.g. "find calls where I used temperature check and see what the
   person said to that") — today the model can only browse
   `list_performance_reviews`' metadata (title/date/status/description);
   finding a phrase inside a transcript means opening records one at a
   time and reading them whole.
2. When the AI finds matches, show them as a real visual result (a chat
   card listing each match with its title/date/description), not just a
   prose answer.

Qualitative/"vibe" queries ("find a call that was very tough for me
personally") are a *different* problem already solved today:
`list_performance_reviews` already returns every record's `description`,
ungated, so the model can already reason over it freely — no new tool
needed there, just a clearer nudge in its own tool description so the
model actually leans on that field for this kind of question.

## Decided with the user
- Content-search snippets stay gated exactly like `get_performance_review`
  today — a record's real transcript/notes/analysis content never
  reaches the model for free, search or not.
- Results render as a dedicated chat card (title/date/description per
  match), not just a text answer — same "inline card" pattern
  `PermissionRequest` already established.

## Design
- New tool `search_performance_reviews` (same `mcp/tools/` one-file
  pattern as every other tool): takes a free-text `query`, scans every
  record's `meta.json` (title/description — always-visible, matches a
  "metadata" hit for free) and `user_notes.md`/`transcript.md`/
  `ai_analysis.md` (case-insensitive substring match) for a "content"
  hit.
- Blocking the whole search call on a permission dialog per matched
  record (like `get_performance_review` does for a single read) would
  mean one search firing N simultaneous 180s-timeout prompts — instead
  the tool does a **non-blocking peek** of this session's existing
  tag/always-allow state (`mcp/bridge.rs`'s `/access` endpoint, already
  side-effect-free) for each content match: already-allowed records get
  a real snippet inline; not-yet-allowed ones come back as
  `content_access_required: true` with no snippet. The model is told to
  follow up with a normal `get_performance_review` call on whichever
  match actually matters — which still runs through the exact same
  interactive gate as today, just once, for the one record worth
  opening, not eagerly for every match. The trust boundary is identical
  to today's; only *when* the interactive prompt fires differs.
- Frontend: `assistant.rs`'s stream-json loop already ignores
  `"assistant"`/`"user"` top-level message events (only used for
  `"stream_event"` deltas and the final `"result"`). Confirmed by hand
  (see wiki.md) that a tool call's real result arrives as a top-level
  `{"type":"user","message":{"content":[{"type":"tool_result",
  "tool_use_id":...,"content":"<our JSON>"}]}}` event, matched back to
  the tool's name via a preceding `{"type":"assistant", ...,
  "content":[{"type":"tool_use","id":...,"name":...}]}` event. Tracking
  that id→name map and re-emitting a dedicated `search-results` Tauri
  event (job-id scoped, same shape as `ask-agent-progress`) whenever our
  tool's result comes back lets the frontend render the card without
  touching the plain-text streaming path at all.
- `ChatMessage` gains an optional `searchResults` payload, rendered by
  `MessageList` in place of a plain bubble — exactly the same shape
  `permissionRequest` already uses.

## Phased roadmap

**Phase D — the tool itself, backend only.**
`mcp/tools/search_performance_reviews.rs`, a non-blocking `peek_access`
added to `mcp/permission.rs`, wired in `server.rs` + `mcp/config.rs`'s
`ALLOWED_TOOLS`, `TOOL_USE_RULE` extended to name the new tool and when
to reach for it vs. the existing pair, `list_performance_reviews`'s own
description nudged to call out `description` as fair game for
qualitative questions. `cargo check`/`cargo test` clean.

**Phase E — the results card, frontend.**
`src/lib/mcp/types.ts`/`src/lib/chat/types.ts` gain the `searchResults`
payload shape; `assistant.rs` emits `search-results`;
`src/lib/assistant/askAgent.ts` gains `onSearchResultsProgress`;
`AIAssistant.script.ts` subscribes per-jobId in `dispatchAgentReply` and
appends the card message; new `MessageList/children/SearchResults/`
element; `MessageList.tsx` renders it. `tsc --noEmit`/`npm run lint`/
`npm run build` clean, `npm run app:build` reinstalled.

## Status
Both phases built.

**Phase D** — `mcp/tools/search_performance_reviews.rs`, `mcp/permission.rs`'s
`peek_access`, wired into `server.rs`/`mcp/config.rs::ALLOWED_TOOLS`,
`TOOL_USE_RULE` extended, `list_performance_reviews`'s description nudged
toward reasoning over `description` directly for qualitative questions.
`cargo check`/`cargo test` clean (48 tests, 2 new). Verified by hand
against this machine's own real records (`~/Documents/Master's
Wheel/Closer/records`, not a fixture) via raw MCP stdio — see wiki.md:
a real Czech-language query against real transcripts correctly returns
matches sorted by date with `content_access_required: true` and no
snippet when no bridge context exists (fails closed), and real,
UTF-8-safe snippets once a mock bridge reports the session already has
access.

**Phase E** — `src/lib/mcp/types.ts`/`src/lib/chat/types.ts` gained
`SearchResultsPayload`/`searchResults`; `assistant.rs`'s stream loop now
tracks each reply's `tool_use` id → (name, query) and emits a
`search-results` event the moment `search_performance_reviews`'s own
result comes back (confirmed by hand — see wiki.md — that a top-level
`"assistant"`/`"user"` message event, not the `"stream_event"` deltas
this loop already handled, is where `tool_use`/`tool_result` blocks
actually live); `askAgent.ts` gained `onSearchResultsProgress`;
`AIAssistant.script.ts`'s `dispatchAgentReply` subscribes per-`jobId`
and appends the card the moment it fires, mid-reply, not held until the
final text; new `MessageList/children/SearchResults/` element (reuses
`CALL_STATE_META`'s glyph/color, same pattern `VideoListItem` already
uses — no new color tokens). `tsc --noEmit`/`npm run lint`/`npm run build`
clean, `npm run app:build` reinstalled.

Not yet confirmed by the user's own click-through in the real app (ask
an agent something like "find calls where I mentioned [a real word]" and
watch for the card) — the Rust-side plumbing (tool call → stream parsing →
event emission) is hand-verified end-to-end up to the Tauri event; the
React side (listener → appended message → SearchResults render) is only
`tsc`/`lint`/`build`-clean, not click-tested, per this project's
no-browser-automation rule.

## Next
Rebuilt `.app` is already installed at `/Applications/Master's Wheel.app`
— open it, open a chat with any agent, and ask something that should hit
`search_performance_reviews` (a literal word/phrase you know appears in
one of your real transcripts, e.g. "find calls where I mentioned
[word]"). Confirm: (1) the model actually calls the tool instead of
guessing, (2) a SearchResults card appears mid-reply (before the text
reply finishes), (3) matches with `content_access_required` show no
snippet and the model correctly follows up with `get_performance_review`
(triggering the normal Decline/Allow/Always Allow card) if it wants to
read one. Also worth trying a qualitative question ("which call was
hardest for me") with no literal phrase — confirm the model answers
straight from `list_performance_reviews`' description field instead of
calling search_performance_reviews with a made-up phrase.

If all three check out, this round is done — no further phases planned
unless the click-through surfaces a real bug (same pattern v1's Phase
A–C fixes followed: build, hand-verify what can be verified without the
browser, then fix whatever the user's own first real use turns up).
