# Wiki — MCP tools: standard + first capability

Durable decisions and hand-verified facts for this update. Research/design
rationale lives in the approved plan
(`/Users/stage/.claude/plans/glistening-cooking-pony.md`) — this file
tracks what actually got verified by hand once built, same discipline
AGENTS-ENGINE's wiki.md used for `--bare`/`--resume`/`--tools ""`.

## Decided
- Tags and "Always Allow" grants are scoped to one chat session, not
  shared globally across every open chat — explicit user choice, asked
  directly since it's a real data-model fork (per-session field vs. a
  separate global store).
- `list_performance_reviews` (metadata: id/date/status/description) is
  never gated — only `get_performance_review` (actual notes/transcript/
  analysis content) goes through the tag/permission check.
- The MCP server is a Rust binary using `rmcp`, not a Node/`npx`-resolved
  script — matches this app's "shell out to a real local binary, no
  network dependency" precedent (`ffmpeg`, `curl`, `claude`).

## Verified by hand (Phase A)
- `claude -p --help` (CLI 2.1.212) confirms the exact flags assumed in
  the plan: `--allowedTools`/`--allowed-tools <tools...>` (comma **or**
  space separated), `--mcp-config <configs...>` (JSON files or inline
  strings, space-separated), `--strict-mcp-config` ("Only use MCP
  servers from --mcp-config, ignoring all other MCP configurations").
- `rmcp` 3.8.0's stdio transport handshakes correctly: hand-fed a raw
  `initialize` → `notifications/initialized` → `tools/list` →
  `tools/call` JSON-RPC sequence directly over stdin/stdout (bypassing
  `claude` entirely) and got back a well-formed `tools/list` with our
  one tool's schema, then a real `tools/call` result reading this
  machine's actual Performance Review records from disk.
- **End-to-end through the real CLI**: built the debug binary, wrote a
  `--mcp-config` JSON pointing its `command` at that binary with
  `MASTERS_WHEEL_MCP_SERVER=1`, then ran a real
  `claude -p "..." --mcp-config ... --strict-mcp-config --allowedTools
  mcp__masters_wheel__list_performance_reviews --permission-mode
  dontAsk` by hand. The model actually called the tool and answered
  correctly from its real result (record count + most recent title,
  matching the raw stdio test) — `permission_denials` was empty,
  confirming the allowlist took effect rather than silently blocking the
  call. This is the full path `assistant.rs` now uses for every reply.
- The "re-exec this same binary with an env var instead of a separate
  bin target" design (see `server.rs`'s doc comment) sidesteps the
  original plan's open question about bundling/code-signing a second
  compiled binary into the packaged `.app` — there's only ever one
  binary, already bundled, already wherever `current_exe()` points.
  Deviates from the approved plan's literal "new cargo bin target"
  file list; same architecture (Rust, no Node, no network), better
  mechanics, discovered while implementing.

## Live bug found right after Phase C — the AI never actually looked

Live test (user): opened a chat with Lukas AI while a Performance Review
record was visibly tagged "suggested" at the top of the chat, asked it
(in Czech) to analyze the call with reasonable (not perfectionist)
scoring bands. Lukas AI asked for a transcript to be pasted in — it
never attempted either tool.

**Root cause, two compounding gaps, both in `knowledge/prompt.rs`'s
system-prompt assembly (not in the gating/bridge machinery itself, which
was already correct):**

1. **A tag was never actually told to the model.** The tag UI/bridge
   exists purely to gate *whether* a tool call is pre-authorized — it
   was never woven into anything the model actually reads. Even if the
   model had called `list_performance_reviews`, it would see ~70 records
   with no signal which one "my call" meant.
2. **`CORE_RULE` actively discouraged tool use.** It said facts must be
   backed by "knowledge excerpts... or your persona instructions" —
   tool results weren't a listed source at all. A model following that
   instruction literally and correctly concluded it had no grounds to
   state anything about a specific call, and asked for a transcript
   instead — not a flaky model response, a direct logical consequence
   of our own wording.

**Fix**, all in `knowledge/prompt.rs` + `assistant.rs` (no change needed
to the bridge/gating logic, which was already behaving correctly):
- `CORE_RULE` now lists "a tool call's own result" as a third acceptable
  source.
- New unconditional `TOOL_USE_RULE`: names both tools by their real
  names, states when to use them ("analyze/review/discuss a call"), and
  tells the model not to ask for a pasted transcript unless the tools
  themselves come up empty.
- New `build_tagged_context`: every record currently tagged in the chat
  (resolved via the already-live bridge state, `Bridge::tags_for_session`
  — `assistant.rs` already runs in-process and holds `tauri::State<Bridge>`,
  no HTTP round-trip needed) gets spelled out by title and `record_id`,
  with an explicit "if they say 'my call' without naming one, use this
  id" instruction. Placed ahead of the persona block, matching the same
  "reference material before instructions" placement the knowledge
  block already used.

**Verified by hand against the real `claude` CLI**, not just unit tests:
reproduced the exact live failure shape first (hand-built the *old*
system prompt text, a tagged record, "analyze my call" in Czech) wasn't
separately reproduced byte-for-byte, but the *fixed* prompt was tested
directly — handed the real CLI a system prompt built the same way
`assistant.rs` now builds it (tagged record's real title + `record_id`
spelled out, `TOOL_USE_RULE` present), asked the same Czech question, and
watched the streamed tool-call events: the model called `ToolSearch` to
load the tool's schema (this account's own Claude Code config defers
tool schemas generally — a separate, pre-existing mechanism, not
something this project controls) and then called
`mcp__masters_wheel__get_performance_review` with exactly the tagged
record's `record_id` as its argument. No transcript request.
6 new Rust unit tests cover the prompt-text assembly itself (tagged
block content, placement before `<persona>`, both rule constants'
wording) — `cargo test` is now 16 tests total, all passing.

## Live bug #2 — 127k tokens for one analysis: built-in tool schema bloat came back

Live report (user): one "analyze my call" reply cost 127k tokens.
Suspected (correctly) that something beyond the transcript + Lukas AI's
instructions was responsible.

**Root cause, confirmed by hand, not guessed**: `--tools` and
`--allowedTools` are two unrelated flags (`claude -p --help`):
`--allowedTools` grants *permission* to use specific tools;
`--tools <tools...>` controls which tools — from the CLI's own built-in
set (Bash, Edit, Read, Task, ToolSearch, …) — even get a schema
*declared* to the model at all, independent of permission. `main`'s
commit `5f325a4` had already found and fixed this once: with nothing
allow-listed, the CLI still declared every built-in/skill/MCP tool's
schema by default, costing ~20k+ tokens/reply for a slice that used no
tools at all — fixed there with `--tools ""`. When this update's Phase A
added `--mcp-config`/`--strict-mcp-config`/`--allowedTools`, `--tools ""`
was dropped under the (wrong) assumption it was superseded — it solves a
different, orthogonal problem and was never replaced.

**Reproduced by hand**: a trivial `claude -p "hi"` call with this app's
real `--mcp-config` wired in used ~30k total input tokens
(cache-creation + cache-read) without `--tools ""`, vs. ~10k with it
added back — on a one-word message, before any real conversation,
knowledge, or tool result content enters the picture at all. The 127k
figure also legitimately includes real content this flag doesn't
touch — the system prompt (persona + tagged context + the `TOOL_USE_RULE`
fix above), any knowledge-RAG chunks, and critically the actual
`get_performance_review` result (a real call's transcript can easily run
into the thousands of tokens on its own) — so a large total for one
real analysis isn't inherently wrong, but the ~20k built-in-tool tax on
top of it was pure, avoidable waste.

**Fix**: `--tools ""` added back in `assistant.rs`, alongside
`--mcp-config`/`--strict-mcp-config`/`--allowedTools` (not instead of).
**Verified this doesn't break MCP tool calling** — re-ran the same
tagged-record "analyze my call" test from the bug above with `--tools ""`
present: the model still calls `get_performance_review` with the correct
`record_id`, and does it *faster* (tool schema declared directly instead
of needing a `ToolSearch` discovery round-trip first, which this
account's own Claude Code config inserts for less-common tools —
unrelated to this app, a pre-existing behavior of the CLI installation
itself).

## Live bug #3 — "New chat" sometimes creates two sessions that move together

Live report (user): a new chat appeared as two entries in history that
"shine together" — acting on one visibly affects the other.

**Root cause**: the in-memory placeholder draft session always starts
life with `id = NEW_SESSION_ID` ("current") before anything's loaded
from disk (`AIAssistant.script.ts`'s initial `useState`). If an
*earlier* app launch ever picked an agent for that exact first-ever
draft, `startChatWithAgent` converts it to a real chat **in place**,
keeping its id — so `chats/current.json` becomes a real, permanently
`id: "current"` saved session. Every *later* launch's fresh placeholder
also defaults to `id: "current"` before the disk load resolves; the
load-merge logic (`current.find(isDraftSession) ?? makeNewSession(...)`)
reused that in-memory draft without ever checking whether a *loaded*
session already claimed the same id. Two distinct `ChatSession` objects
end up sharing one id — and since every mutation in this file is
`current.map(session => session.id === id ? updater(session) : session)`,
a non-short-circuiting map, **both** entries satisfy the predicate and
both get updated by any single action targeting that id. That's the
"shine together" symptom: one is the empty draft, the other a real past
chat, forever updating in lockstep. Never actually written to disk twice
(drafts are never saved) — purely a recurring in-memory artifact on every
launch once the collision condition exists.

**Fix**: the load-merge effect now checks whether the current in-memory
draft's id already appears among the sessions just loaded from disk; if
so, it discards the draft and generates a fresh `crypto.randomUUID()`
one instead of reusing the colliding id. No disk cleanup needed — the
duplicate was never persisted. No JS test added (this repo has no JS/TS
test runner set up yet — adding one for a 5-line collision check felt
like more scope than the fix warranted); covered by hand-tracing the
exact sequence instead, recorded here for anyone revisiting this.

## Phase C notes

- **Nested-struct field casing bit us once, fixed before it shipped**:
  Tauri's command-arg case conversion (camelCase JS → snake_case Rust
  parameter names) only applies to a `#[tauri::command]` function's own
  top-level parameters — a struct passed *as* one of those parameters
  (`TagDto` here) still goes through plain serde field matching. Caught
  by re-reading the wire shapes side by side rather than by a failing
  test; added `#[serde(rename_all = "camelCase")]` to `TagDto`.
- **A real concurrency bug caught before it shipped**: Phase 2
  (MULTI-AGENT-CHAT) already dispatches multiple agents' `ask_agent`
  calls in parallel for one shared chat session. The first version of
  `mcp/config.rs::write_config_file` keyed its temp file path only by
  this process's pid — constant for the app's whole lifetime — so two
  parallel calls (same chat session, different `agent_id`) would race on
  writing/reading the same `--mcp-config` file. Fixed with a per-call
  atomic counter in the filename; no test added since this is a file-path
  uniqueness fix, not a logic path worth a unit test — covered by
  inspection instead.
- **Rust unit tests added for the actual gating decision**
  (`mcp/bridge.rs`'s `SessionAccess::resolve` + `Bridge::respond`/
  `sync_tags`) — 10 tests, all passing: suggested/active/always-allowed
  each preauthorize correctly and report the right `via`; an untagged,
  unallowed record never preauthorizes; one record's tag/grant never
  leaks to another; `respond("always-allow")` actually grants future
  access in that session while `respond("decline")` never does;
  `sync_tags` replaces rather than merges with a previous sync (so a
  removed tag actually disappears, not just gets shadowed). This is the
  "real logic lands, cover it" point CLAUDE.md asks for — Phase A/B were
  still UI-shell/plumbing, this is the first actual decision logic.
- **Verified by hand, not just unit tests**: relaunched the packaged
  `.app`, confirmed `127.0.0.1:47822` bound, then drove the bridge's raw
  HTTP surface directly with `curl` — `/access` on an unknown session
  correctly returns `{"preauthorized":false,"via":null}`; `/mark-used`
  returns 200 immediately; `/permission-request` genuinely blocks (a
  3s-capped curl call timed out client-side rather than getting an
  instant reply, proving the connection is actually held open on a
  channel receive, not just slow). Separately ran the real `claude` CLI
  by hand (not just the raw MCP stdio test from Phase A) against
  `get_performance_review` with no tag/always-allow synced for the test
  session — exercises the complete real path: CLI → mcp_server →
  bridge `/access` (false) → `/permission-request` → 180s timeout →
  "decline" → the tool's own polite decline text → the model's reply.
  No UI click-through was performed (off-limits per CLAUDE.md for this
  project) — the Decline/Allow/Always-Allow buttons themselves still
  need the user's own click-through to confirm.

## v2 — content search (`search_performance_reviews`)

**Raw stream-json event shapes, hand-verified before writing any
parsing code** (not assumed from docs): ran a real `claude -p
--output-format stream-json --include-partial-messages` call that
actually used a tool (plain `Bash`, outside this app's own MCP config,
just to see the generic shape) and inspected the raw NDJSON. Confirmed
`assistant.rs`'s existing loop only ever handled `"stream_event"`
deltas and the final `"result"` — a tool call's actual request/result
pair arrives as two *separate* top-level event types it was silently
ignoring: `{"type":"assistant","message":{"content":[{"type":"tool_use",
"id":...,"name":...,"input":{...}}]}}` followed later by
`{"type":"user","message":{"content":[{"type":"tool_result",
"tool_use_id":...,"content":"<string>"}]}}`. `tool_result.content` for
an MCP tool is the plain JSON string our tool returned, not a parsed
object — confirmed directly rather than assumed. This shape is what
`assistant.rs`'s new `tool_use_names` map + `Some("assistant")`/
`Some("user")` match arms are built against.

**`search_performance_reviews` verified against this machine's own real
records**, not a fixture — `~/Documents/Master's Wheel/Closer/records`,
real Czech-language sales-call transcripts. Built the debug binary, fed
raw `initialize`/`tools/list`/`tools/call` JSON-RPC over stdin with
`MASTERS_WHEEL_RECORDS_ROOT` pointed at that real directory:
- With no `MASTERS_WHEEL_BRIDGE_PORT`/`MASTERS_WHEEL_CHAT_SESSION_ID`
  set (no bridge context, same as `check_access`'s existing fail-closed
  path), every content match correctly came back
  `"content_access_required": true` with no `snippet` key at all —
  `peek_access` fails closed exactly like `check_access` already does,
  and real records' `description` text was still visible for free
  (confirming `list_performance_reviews`-style metadata is never
  gated).
- Stood up a one-file Python mock of the bridge's `/access` endpoint
  (always returns `preauthorized: true`) on `127.0.0.1:47999`, pointed
  `MASTERS_WHEEL_BRIDGE_PORT` at it, reran the same query:
  `content_access_required` flipped to `false` and real snippets came
  back, correctly centered on the matched word with `…` truncation
  markers — including one match inside a transcript with multi-byte
  Czech diacritics, confirming the char-indexed (not byte-indexed)
  snippet windowing never splits a UTF-8 character.
- Results came back sorted by date descending and correctly capped by
  `max_results` in both runs.
