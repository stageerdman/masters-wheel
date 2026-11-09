# TRAINING-ROOM — build the Training Room page

**Date:** 2026-11-06
**Status:** OPEN

## Goal
Build the UI shell (no backend, no real transcription — fake/in-memory data
only) for Training Room: a practice space that mirrors Performance Review's
three-column layout almost exactly, but isn't tracked in performance.
Sessions here are scalable by "training tool" — the first tool is **Voice
Practicing**. Real storage/transcription wiring is a later phase, same
sequencing Performance Review itself followed (see
`updates/2026-10-28 PERFORMANCE-REVIEW - OPEN/`).

## Context
User-dictated spec (full breakdown in `wiki.md`). Same page shell as
Performance Review — Navigation / Hero / Detail — with these differences:

- **Navigation**: a pinned `+` ("add a new training practice") above the
  list instead of a trailing "Add record" row; sessions split into **Open
  Sessions** (sorted by recency of last use) and **Closed Sessions** below
  that; each row shows a fixed, non-user-editable type icon, an editable
  name, and a relative "last used" label (`1d`, `30d`, `1m`, ...). Right-click
  offers **Remove session** (destructive, deletes its media from storage
  too) and **Close session** (a green checkmark — the first non-destructive
  tone `ContextMenu` has needed).
- **Hero**: driven by the session's tool type. Voice Practicing starts with
  an empty "upload a clip" placeholder; each uploaded clip (video *or*
  audio) stacks into a scrollable, Facebook-feed-style list, newest on top,
  with an optional "Generate transcript" button per clip and a
  lyrics-style, word-by-word-synced transcript under it once generated.
  Dropping in another clip prepends to the feed.
- **Detail**: same drag-to-split rail mechanism as Performance Review's
  Detail, but seeded with a single content kind (**Notes**) for now, since
  Voice Practicing has nothing else to show there (the transcript already
  lives inline in the Hero feed).

Two decisions made with the user before starting (2026-11-06):
1. Clips support both video and audio in v1 (not video-only).
2. The split-rail mechanism (`BookmarkBadge`/`BookmarkRail`/`SplitRail`/
   `useSplitRail`) gets **generalized now** into a reusable primitive over
   an arbitrary kind list, rather than staying hardcoded to Performance
   Review's 5 content kinds — Training Room is a second real consumer
   today, not a hypothetical future one.

## Roadmap

### Phase 1 — Generalize the shared split-rail/context-menu primitives
- [x] `ContextMenu`: `ContextMenuItem.destructive?: boolean` →
      `tone?: "destructive" | "positive"` (adds a green "close" affordance
      via the existing `--color-status-closed` token — no new core color).
- [x] `BookmarkBadge`: drop the hardcoded `ContentKind`/`BOOKMARK_META`;
      take a generic `kind` + `meta: { label, color }` instead.
- [x] `BookmarkRail`: generic over `kinds`/`metaFor`/`active`/`onSelect`
      instead of a fixed 5-kind `ORDER`.
- [x] Promote `SplitRail` out of
      `PerformanceReview/children/Detail/children/` to flat
      `src/elements/SplitRail/`, generalized the same way.
- [x] Move the split-state logic (`useSplitRail`, currently
      `Detail.script.ts`) into `src/lib/splitRail.ts`, parameterized by
      `kinds`/`storageKey`/`defaultActive` so each page keeps its own
      persisted layout under its own key.
- [x] Re-point Performance Review's `Hero`/`Detail`/`TextView` at the
      generalized primitives; `ContentKind`/`CONTENT_KIND_META` move into
      `PerformanceReview.data.ts` (page-specific metadata, same home as
      `CALL_STATE_META`). No visible behavior change for that page.

### Phase 2 — Page shell + Navigation
- [x] `TrainingRoom.data.ts`: `TrainingSession`/`TrainingClip` types,
      `TOOL_TYPE_META` (icon/color/label per tool type — just
      `voicePracticing` for now), fake in-memory fixture.
- [x] `TrainingRoom.script.ts`: in-memory session state (add/remove/
      close/reopen session, add clip, fake transcript generation) — no
      disk writes this phase.
- [x] `TrainingRoom` 3-column shell (mirrors `PerformanceReview.tsx`),
      wired into `src/app/training/page.tsx`.
- [x] Navigation column: pinned add-session item, Open/Closed grouping,
      `SessionListItem` (icon + editable name + relative-date via new
      `formatShortRelativeTime`), right-click menu (remove/close).

### Phase 3 — Hero (Voice Practicing feed)
- [x] Reuse `VideoUploadModal` (now accepting optional title/instructions
      text) for clip upload — accepts video or audio.
- [x] Clip feed: newest-first, each item = media player (video or audio)
      + optional "Generate transcript" + transcript slot.
- [x] New `LyricsTranscript` element: word-by-word highlight driven by the
      player's real `timeupdate`, word spans interpolated evenly across
      each (fake) transcript line's start/next-line-start window — a real
      interaction, just built on fake per-line timestamps this phase. See
      `wiki.md` for why this isn't real word-level data yet.

### Phase 4 — Detail (Notes)
- [x] `TrainingRoom`'s `Detail` reuses the generalized `SplitRail` +
      `useSplitRail`, seeded with a single `"notes"` kind under its own
      `training-room-detail-split` storage key.

### Phase 5 — Wire up + verify
- [x] `MainMenu`'s existing dormant `"training"` nav entry → `/training`,
      relabeled "Training Room".
- [x] `npm run build` / `lint` / `tsc --noEmit` clean.
- [x] `FEATURES.md` gets a new Training Room section.
- [x] Rebuild and reinstall the `.app`.

### Phase 6 — Follow-up fixes (2026-11-06, same day)
- [x] Hide the native scrollbar in Hero's feed and `LyricsTranscript`'s
      scroll area (same treatment as `StatSpace`) — scrolling still works,
      the chrome just isn't needed in the main view.
- [x] Fix "last used" semantics: renamed `lastUsedAt` → `lastUpdatedAt`,
      dropped the bump on mere select/open, added a debounced bump on
      real content edits (notes text, adding a clip) — selecting a
      session in Navigation no longer reorders the Open Sessions group.
- [x] Fix real bug: an uploaded clip never actually played. Root cause —
      Tauri's asset protocol (what `convertFileSrc` needs) is scoped to
      `$DOCUMENT/Master's Wheel/**` (`tauri.conf.json`), and a file picked
      from anywhere else on disk is silently refused, so the `<video>`
      element never loads anything. Fixed by copying the picked file into
      real Space storage first (new `src/lib/training`, same
      cross-filesystem-copy pattern `src/lib/records` uses for hero
      files) before building its playback URL — see `wiki.md`. Session
      *metadata* (the list itself) is still in-memory only; only the clip
      *files* are real now.

### Phase 7 — Real session-metadata persistence (2026-11-08)
- [x] New `src/lib/training` exports (`listSessions`/`createSession`/
      `writeSessionMeta`/`deleteSession`/`clipAbsolutePath`), same
      meta.json-per-folder shape as `src/lib/records`: each session's
      folder (`training/<id>/`, already real for clip files) now also
      holds `session.json` (toolType, name, status, lastUpdatedAt, notes,
      clip metadata).
- [x] `TrainingRoom.script.ts` loads real sessions on mount (dropped
      `INITIAL_SESSIONS`, same empty-until-real-data starting point
      Performance Review had before `src/lib/records`), debounces
      name/notes writes, writes immediately on status change/clip
      add/transcript generation, and deletes the whole session folder on
      remove (superseding the old clip-only `removeSessionStorage`).
- [x] `TrainingClip` gained `storedFileName` (the on-disk timestamped copy
      name) alongside the display `fileName`, so a reloaded session can
      rebuild each clip's `convertFileSrc` URL.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 8 — DisciplinePicker (2026-11-08)
- [x] Renamed the "tool type" concept to **discipline** in user-facing
      copy, and `voicePracticing` → `voiceTraining` (TrainingRoom.script.ts
      migrates a session.json written under the old name on load). Four
      disciplines now exist in `TOOL_TYPE_META`: **Voice Training** (real,
      unlocked), **Chat Roleplay**, **Voice Roleplay**, **Mindset
      Shifting** (all three locked/"coming soon").
- [x] Clicking Navigation's "Add a discipline" row no longer creates a
      session directly — it opens a new full-bleed `DisciplinePicker`
      takeover (dictated design: "Ironwork Portraits" — riveted metal
      frames, a torch per frame, carved nameplates; see `wiki.md` for the
      design pass this replaced). Selecting Voice Training plays a brief
      "ignite" confirmation, then creates the session and returns to
      Training Room, same as the old direct-create flow.
- [x] Four real states per `DisciplineFrame`: locked (dead wick, inert),
      available-idle (lit, flickering), hovered/keyboard-focused (brighter,
      lifts — locked frames deliberately don't react to hover at all), and
      confirming (the ignite flash). Escape and a click on blank space both
      close the picker without creating anything.
- [x] New `--discipline-*` token block in `globals.css` (documented,
      exempt from the core-5 the same way `--glass-*` already is) plus
      three new `--color-discipline-*` category colors — each discipline's
      own accent is blended into the shared orange ironwork chrome via
      `color-mix()` at a low ratio, so the picker reads as one lit world
      with a subtle per-discipline tint, not a tile per color.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 9 — DisciplinePicker redesign: gilded 3D flip cards (2026-11-08)
- [x] Replaced Ironwork Portraits' torch/bezel/plaque frames with gilded
      trading cards (dictated design pass, see `wiki.md`): each
      `DisciplineFrame` is now a full 3D object — `.flipInner` holds two
      complete card faces (front: icon medallion + name pill; back:
      description plaque) rotated 180° apart, so hovering spins the whole
      card, not just an inner window inside a frame that stayed put.
- [x] New card material: antique bronze/pewter metal with a cream
      secondary accent (dictated from a reference medallion image),
      replacing the old amber ironwork palette — new
      `--discipline-gold-1/2/3`, `--discipline-cream`, `--discipline-ink`,
      `--discipline-parchment-1/2` tokens in `globals.css`, same
      documented-exemption pattern as `--glass-*`. The picker's backdrop
      is now a neutral warm-black matching the app's real dark-mode
      surface family, not the previous blue-tinted navy.
- [x] Crests swapped to flat pictograms matching the new material
      (speaker for Voice Training, speech bubble for Chat Roleplay; mask
      and eye unchanged) plus new decorative symbols (corner scrollwork,
      4-point sparkles, a lock badge, a checkmark "confirming" badge) and
      a gold-foil `linearGradient` the icons/strokes paint with instead of
      a flat fill.
- [x] Fixed a real cross-card hover bug: the "other cards recede" effect
      must only fire when the pointer is over an actual card, not
      anywhere in the grid's own box (the gaps between cards count as
      "inside the grid" too) — `.grid:has(> button:hover) > button:not(:hover)`
      instead of a naive `.grid:hover` rule.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 10 — Fix WebM clips not playing (2026-11-08)
- [x] Root cause confirmed empirically (not assumed): WKWebView/Safari on
      macOS has never supported WebM's codecs (VP8/VP9 video, Opus/Vorbis
      audio) — the file stored and resolved to a playable URL correctly,
      the `<video>` element just couldn't decode it, showing its native
      broken-media icon. See `wiki.md` for how this was verified.
- [x] New `src-tauri/src/transcode.rs` (`transcode_to_mp4`, shelled out to
      ffmpeg, same pattern as `transcribe.rs`) re-encodes to H.264/AAC MP4.
      `storeClipFile` (`src/lib/training`) now transcodes instead of
      copying when the source extension is webm/mkv/avi/flv/wmv; mp4/mov/
      m4v are untouched.
- [x] `npm run build` / `lint` / `tsc --noEmit` / `cargo check` clean;
      `.app` rebuilt and reinstalled.

### Phase 11 — Chat Roleplay discipline, UI-shell prototype (2026-11-08)
Full dictated spec in `wiki.md`'s "Chat Roleplay discipline" section —
design process was 4 parallel UX-expert passes + a synthesis pass + a
clickable HTML Artifact the user reviewed first, then this real-code pass
with several deliberate changes from the Artifact.
- [x] Unlocked `chatRoleplay` in `TOOL_TYPE_META`; `TrainingRoom.tsx`
      branches on `toolType` to render the new `ChatRoleplaySession`
      instead of the generic Hero/Detail for this discipline.
- [x] `ChatRoleplaySession` (new, `TrainingRoom/children/`): setup chat +
      editable Proposal Card + confirm → scenario Hero (clickable
      assumptions/description popover, amend-not-overwrite edits) → the
      roleplay transcript itself. All scripted/local state — no backend
      call drives any of the setup/roleplay/next-session content yet.
- [x] Dual-layer chat: one composer (reply + an optional attached private
      "thought", sent together in one turn — not two separate composer
      rows like the Artifact had), thought renders above the reply under
      the speaker's name, one eye-open/closed button to show/hide every
      thought at once (replaces the Artifact's 3-state toggle).
- [x] "Not set up yet" sticky indicator before confirmation.
- [x] "Next Session": resets the roleplay transcript under the same
      locked scenario/assumptions, plus one carried-forward adjustment
      phrase (mocked pool, not real-AI-generated yet); past phrases
      accumulate in the Hero's details popover.
- [x] **Real, not mocked:** new `AIAssistant.context.tsx`
      (`AIAssistantVisibilityProvider`) lets a mounted component hide the
      floating `AIAssistant`; `AITrainerPane` is a second, independent,
      always-open `useAIAssistant()` instance (same real backend/agents,
      same reused `MessageList`/`Composer`/`AgentPicker` — the exact
      `ChatPage` precedent) docked in the Detail sidebar's top pane,
      hiding the floating widget while mounted so the two are never both
      on screen. `DetailContentKind` extended to `"notes" | "trainer"`;
      new `CHAT_ROLEPLAY_DETAIL_KIND_ORDER` reuses the same real
      `SplitRail`/`useSplitRail` every other Detail column uses. The
      bottom pane reuses the session's real, already-persisted
      `notes`/`onNotesChange` — genuinely never read by any AI.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.
- [x] `FEATURES.md` updated for this discipline.

### Phase 12 — Chat Roleplay revisions: collapsed Hero, session rounds, final report (2026-11-08, same day)
Full reasoning in `wiki.md`'s "round 2 revisions" section.
- [x] Hero collapses to one line (green `--color-reviewed` dot + the
      scenario name, now literally `TrainingSession.name` — shared and
      editable from either Navigation or here) — expands only on
      clicking that whole line, same precedent as Performance Review's
      `Hero`/`MetaPanel`.
- [x] Replaced the flat turns/round-counter state with real
      `SessionRound[]` — only the latest round is live; every earlier one
      is permanently observe-only (`RoleplayChat`'s composer drops
      entirely, replaced by a "Viewing Session N — read-only" bar).
- [x] Expanded panel: description/report, assumptions, a clickable,
      removable **Sessions** list (each round's adjustment phrase + its
      own generated report), **Next Session**, and a green **Generate
      final report** button beneath it (visible only while expanded).
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 13 — Chat Roleplay fixes: bounded scroll, pinned actions, markdown report (2026-11-08, same day)
Full reasoning in `wiki.md`'s "round 3 revisions" section.
- [x] Fixed a real bug: the Hero's panel grew without bound as sessions
      accumulated, eventually pushing its own action buttons (and the
      chat below) off-screen. The description/assumptions/sessions list
      now scrolls inside a bounded `max-height` area; Next Session and
      Generate final report moved out of it entirely, into their own
      pinned column beside the bar+panel — Next Session stays reachable
      even collapsed, Generate final report joins it once expanded, and
      neither can ever scroll away.
- [x] The final report is now real markdown (headings/bold/bullet lists
      per session), rendered via `react-markdown` (already a dependency,
      same one `Message.tsx` uses) — every heading maps to the one shared
      title style "Assumptions"/"Sessions" already use, not a separate
      look.
- [x] Added an "Assumptions" section title above the assumptions list,
      reusing that same shared heading style (renamed from
      `roundsHeading` to `sectionHeading` now that three things use it).
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 14 — AI Trainer gets the real chat UI; backend requests logged (2026-11-08, same day)
Full reasoning in `wiki.md`'s "round 4" and new "Backend TODO" sections —
this phase is UI-only; no backend work landed.
- [x] `AITrainerPane` now reuses the same designed chat experience as the
      floating `AIAssistant`/`ChatPage` — a top bar (history toggle + "+"
      new chat) and the real `Sidebar` (`AgentStrip`/`HistoryList`),
      wired exactly like `ChatPage`, defaulting closed (matches the
      floating widget's own default, not `ChatPage`'s always-open one).
      Reuses Sidebar's existing narrow-container takeover behavior
      unmodified via the same named CSS container, not new code.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.
- [x] Logged every backend-deferred request from this feature's whole
      design process (not just this phase) in `wiki.md`'s new
      **Backend TODO** section: scoping the Trainer's chat history to
      the training session; revisiting whether/how the Trainer should
      see the roleplay transcript (the original incremental/full +
      with/without-thoughts retrieval idea, dropped rather than
      resolved once "just reuse the real AI Assistant" became the
      direction); a new Main Menu **Settings** page holding a per-Space
      product/business description; the setup conversation reading that
      description when proposing a scenario; every still-scripted piece
      of content; the session-round persistence assumptions; and making
      the "thoughts never reach the roleplay AI" guarantee a real,
      enforced constraint once a real model call exists.
### Phase 15 — Settings page: per-Space business description (2026-11-08)
Foundation for Phase 17's grounding — independent of everything else below.
- [x] New `src/lib/settings` (plain TS, `settings.json` under
      `spaceDir(folderName)`, same tolerant parse-or-default pattern as
      every other storage module): `readSettings()`/`writeSettings(partial)`,
      one field for now — `businessDescription: string`.
- [x] New `Settings` element + `/settings` route: one labeled textarea
      ("What are you selling, or what do you do in this workspace?"),
      debounced autosave, same precedent as Notes' autosave.
- [x] `MainMenu.tsx`: new nav entry `{ id: "settings", label: "Settings" }`
      → `router.push("/settings")`.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 16 — Rust roleplay backend module (2026-11-08)
New `src-tauri/src/roleplay.rs`, same "shell out to `claude -p`" family as
`assistant.rs`/`transcribe.rs`/`transcode.rs`, but deliberately **not**
built on `ask_agent`: these are fixed internal personas (scenario designer,
the prospect, a coach), not a user-facing Agent, and none of them need
knowledge retrieval, tags, or MCP tool access — `ask_agent`'s whole reason
to exist. Blocking `.output()` calls (like `name_chat`), not streaming —
a thought+reply pair is short enough that streaming buys nothing here.
Output format decided empirically (see `wiki.md`): plain labeled lines
(`THOUGHT:` / `REPLY:`, etc.), not JSON — verified-reliable in two hand-run
`claude -p` tests either way, but labels tolerate a stray quote/apostrophe
inside in-character dialogue that could otherwise break strict JSON
parsing, and that's also what the research pass (below) found most
roleplay/structured-output writeups converge on for a flat two-field
payload. Every parse is defensive: a missing label never errors the
turn, it falls back to treating the whole response as the primary field.
- [x] `generate_setup_reply(message, resume_session_id, business_description) -> SetupReply`
      — scenario-designer persona; either asks a clarifying question or
      emits a structured proposal (`KIND:`/`TITLE:`/`META:`/`ASSUMPTIONS:`
      bullet list) once enough is known; reads `business_description`
      (from Phase 15) so a proposal reflects what this Space actually
      sells. One continuous `--resume`d session across the whole setup
      phase.
- [x] `generate_roleplay_turn(message, scenario_title, scenario_meta,
      locked_assumptions, adjustment_phrase, resume_session_id) ->
      RoleplayTurnReply { thought, reply, sessionId }` — the prospect
      persona. **Refined from the original signature sketch**: takes the
      scenario as structured fields rather than a pre-built
      `system_context` string, and builds the full system prompt
      (persona + scenario + locked assumptions + this round's
      carried-forward adjustment phrase + the reasoning-before-speaking
      + output-contract instructions, including one worked few-shot
      example) inside Rust — same "prompt construction lives on the Rust
      side" shape `assistant.rs`'s `knowledge::prompt` module already
      uses, not left to the frontend to assemble. `message: Option<String>`
      (`None` = persona opens the scene unprompted) — `--resume` carries
      continuity *within* one round; "Next Session" starts a fresh call
      with no `--resume`, since the transcript is meant to reset — only
      the adjustment phrase (plain text, re-fed into the system prompt)
      carries forward, never raw session memory. **Enforced by this
      command's own signature, not a runtime check**: there is no second
      "thought" parameter at all — the frontend physically cannot pass
      the human's private thought into this call (resolves TODO #7).
- [x] `generate_insight(input_text, kind: "adjustment" | "round_report" |
      "final_report") -> String` — one shared one-shot command, three
      system-prompt variants keyed by `kind`. `input_text` for
      `adjustment`/`round_report` is that round's turns rendered
      speaker-labeled, **text only, never thoughts**; for `final_report`
      it's the already-generated per-round reports + adjustment phrases
      concatenated, so the final report is a real synthesis (trends
      across sessions), not just a re-stitch of strings TS already had.
- [x] Unit coverage for the parsers (label-extraction + fallback-to-whole-
      text-on-missing-label), same spirit as `mcp/bridge.rs`'s existing
      `#[cfg(test)]` block — 7 tests, all passing.
- [x] `cargo check` clean. Empirically verified against the real `claude`
      CLI (not just unit-tested): a hand-run `generate_roleplay_turn`-shaped
      call returned clean `THOUGHT:`/`REPLY:` lines with reply tone
      visibly tracking the reasoned emotional state, and a `--resume`d
      follow-up correctly referenced the first turn ("he still hasn't
      told me what he actually does") — real escalating continuity, not
      just independently-correct single turns.

### Phases 17-19 — Wire setup, roleplay turns, and reports to real calls (2026-11-08)
Done together in one pass — the three were tightly coupled enough (one
combined `RoleplayState` object, one `persist` path) that splitting them
into separate commits would have meant repeatedly touching the same
functions. **Refined from the original plan**: no separate
`RoleplayMetaFields` struct in `src/lib/training` — that module stays
genuinely opaque to this discipline's shape (same "doesn't know
TrainingToolType either" stance its file header already took), gaining
just one new `roleplay: unknown` field on `SessionMetaFields`, validated
only on the `ChatRoleplaySession.data.ts` side (`parseRoleplayState`).
All three phases' scripted constants are gone from `ChatRoleplaySession.data.ts`:
`freshProposalCard`, `REFINED_META`, `HERO_SUMMARY`, `PERSONA_OPENING`/
`PERSONA_OPENING_LINE`/`PERSONA_REPLY_POOL`, `ADJUSTMENT_PHRASE_POOL`,
`ROUND_REPORT_FLAVOR_POOL` are all deleted; `SETUP_OPENING_MESSAGE` stays
as a static opener shown before the first real call (there's no user
message yet to send the model, so the "TBD" from the original plan
resolved to the simpler of the two options).
- [x] One consolidated `RoleplayState` (phase, setupThread, setupSessionId,
      scenarioTitle, scenarioMeta, lockedAssumptions, rounds, finalReport)
      replaces the old scattered `useState` calls for everything that
      needs to survive a reload; ephemeral UI-only state (which row is
      mid-edit, whether the details panel is expanded, etc.) stays as
      separate `useState` since it never persists. Every mutation already
      only fired on a commit/submit action (never a raw keystroke), so
      every change calls a single `persist()` that both updates state and
      calls `onRoleplayChange` immediately — no debounce needed.
- [x] `TrainingSession` gained `roleplay: RoleplayState | null`;
      `TrainingRoom.script.ts` hydrates it in `sessionFromSummary` via
      `parseRoleplayState`, and a new `updateRoleplay` writer (same
      `writeNow`-immediate shape as clips/notes — a real content change,
      so it bumps `lastUpdatedAt` too) threads `onRoleplayChange` down to
      `ChatRoleplaySession`.
- [x] `submitSetupMessage` calls `generate_setup_reply` (reading
      `businessDescription` from the new Settings page live, every call —
      not cached); a `question` reply appends an AI text block, a
      `proposal` reply freezes/supersedes the prior card and appends a
      fresh one, exactly like the old scripted flow's visual shape.
- [x] `beginRoleplay` calls `generate_roleplay_turn` with `message: null`
      (the opening-line variant) to get the persona's first line for
      real, locks in `scenarioTitle`/`scenarioMeta`/`lockedAssumptions` as
      permanent record fields, and starts round 1 with that reply's
      `sessionId` as the round's own `claudeSessionId`.
- [x] `sendTurn` calls `generate_roleplay_turn` with only `trimmedText` —
      `thoughtText` never leaves this function, enforced by Phase 16's
      command signature having no thought parameter at all, not a runtime
      check here.
- [x] `nextSession` now does real work: `generate_insight(kind:
      "adjustment")` and `generate_insight(kind: "round_report")` in
      parallel over the finishing round's text-only transcript, then one
      more `generate_roleplay_turn(message: null, adjustmentPhrase: phrase,
      resumeSessionId: null)` call to open the new round — a real reset,
      no `--resume`, only the plain-text phrase carries forward.
- [x] `generateFinalReport` backfills any round missing a report (one
      `generate_insight` call each), then synthesizes all of them via one
      `generate_insight(kind: "final_report")` call — a real cross-session
      synthesis, not a re-stitch of strings already on hand.
- [x] `heroSummary` is now `[scenarioTitle, scenarioMeta].filter(Boolean).join(". ")` —
      derived from the locked proposal, no AI call.
- [x] New `personaLabelFrom()` extracts a display name out of
      `scenarioMeta`'s "Persona: Name, ..." text (falling back to the
      scenario title, then "Persona") — `RoleplayChat`'s hardcoded
      "Marcus"/"Reply to Marcus…" is gone, every discipline-neutral
      scenario gets its own label.
- [x] Every async action got a real busy flag (`isSendingSetup`,
      `isBeginning`, `isSendingTurn`, `isAdvancingSession`,
      `isGeneratingFinalReport`) wired into the composer/button `disabled`
      states in `SetupThread`/`RoleplayChat`/`RoleplayHero` — the UI can
      no longer fire a second call on top of one still in flight, which
      the old instant-scripted version never had to guard against.
- [x] Every failure path surfaces inline (an AI text block in the setup
      thread, a persona-voiced turn, or a report field) rather than
      silently dropping the trainee's action or throwing past the hook —
      "honest error states," not a crash.
- [x] `npm run build` / `lint` / `tsc --noEmit` / `cargo check` clean.
      Not yet click-through verified in the running app — this project's
      CLAUDE.md rules out browser automation here; see this update's
      wiki.md for what a manual pass through setup → first reply →
      Next Session → final report should confirm.

### Phase 20 — Scope the AI Trainer's chat history to its training session (2026-11-08)
Resolves backend TODO #1. Generalized, not special-cased — `AITrainerPane`
is the second real consumer of "a chat history scoped to something
narrower than a whole Space" (the first being the Space-wide chats/ root
every other chat uses).
- [x] `src/lib/chat/storage.ts`: every function (`listSessions`/
      `saveSession`/`deleteSessionFile`/`ensureChatsRoot`) takes an
      optional `root` override, defaulting to `spaceChatsDir(...)` when
      omitted.
- [x] `useAIAssistant()` (`AIAssistant.script.ts`) takes an optional
      `storageRoot` param, threaded into every storage call site (the
      sessions-load effect, `updateAndPersistSession`, `startChatWithAgent`'s
      direct save, `deleteSession`).
- [x] New `src/lib/training` helper: `trainerChatsDir(sessionId)` →
      `training/<sessionId>/trainerChats/`.
- [x] `AITrainerPane` now takes a `sessionId` prop (threaded from
      `RoleplayDetail`, which already had it) and passes
      `trainerChatsDir(sessionId)` into its `useAIAssistant()` call — its
      history is now genuinely private to this one training session, not
      the user's whole real AI Assistant history.
- [x] Fixed a real lint finding this surfaced: `updateAndPersistSession`
      now closes over `storageRoot`, which the `onMcpTagUsed` subscription
      effect's exhaustive-deps check correctly flagged as a missing
      dependency — matching the sibling `onMcpPermissionRequest` effect
      right above it (same "mount once, stable in behavior" reasoning),
      not papered over with an unexplained disable comment.
- [x] `npm run build` / `lint` / `tsc --noEmit` / `cargo check` clean;
      `.app` rebuilt and
      reinstalled.

### Phase 21 — Give the AI Trainer real access to the roleplay transcript (2026-11-08)
Resolves backend TODO #2, decided (not left open) per `wiki.md`'s
reasoning: **ungated**, unlike `get_performance_review` — a Trainer pane
is already scoped to exactly one training session (unlike the general AI
Assistant, which roams across many records in a Space), so there is no
"which record" ambiguity for a tag/permission UI to resolve. No new
Decline/Allow card.
- [x] New MCP tool `get_roleplay_transcript` (own file under
      `mcp/tools/`, same shape as `get_performance_review.rs`): params
      `round_number` (omit = latest/live round), `with_thoughts: bool`,
      `offset`/`limit` (same char-indexed pagination). Reads
      `session.json` directly from a training-session path the
      subprocess learns via a new env var
      (`MASTERS_WHEEL_TRAINING_SESSION_PATH`), same channel
      `RECORDS_ROOT_ENV` already uses — not a tag lookup. Walks the raw
      JSON by the same camelCase field names
      `ChatRoleplaySession.data.ts`'s `RoleplayState` uses, since neither
      side of the Rust/TS boundary has a typed model of that shape (same
      "opaque to this module" stance as `src/lib/training`'s own
      `roleplay: unknown` field).
- [x] `mcp/config.rs`'s `write_config_file` gains an optional
      `training_session_path` argument; when present, writes the env var
      into that one call's generated MCP config. New
      `TRAINING_ALLOWED_TOOLS` constant (just this one tool) is only
      appended to `ALLOWED_TOOLS` by `assistant.rs`'s `ask_agent` when a
      training session was actually passed in — absent for every
      ordinary `ask_agent` call (floating widget, `/chat`, a dedicated
      agent chat), so that tool's schema is never even declared outside
      a Trainer-pane call.
- [x] New `spaces::training_dir()` (mirrors the existing
      `records_dir()`/`agents_dir()` helpers). `assistant.rs`'s
      `ask_agent` gains an optional `training_session_id: Option<String>`
      param (just the session id — the folder name, per
      `src/lib/training`'s own convention — not a full path) and resolves
      it to an absolute path itself via `training_dir`, the same place
      `records_root` is already resolved for every other call.
- [x] Threaded end-to-end: `askAgent.ts` gains `trainingSessionId?`;
      `useAIAssistant()` gains a second optional param carrying it into
      every `dispatchAgentReply` call; `AITrainerPane` passes its own
      `sessionId` (the same one `trainerChatsDir` already uses for
      storage scoping).
- [x] `npm run build` / `lint` / `tsc --noEmit` / `cargo check` clean —
      `cargo test` also run (27 tests, all passing, including every
      existing suite — nothing else regressed); `.app` rebuilt and
      reinstalled.

### Phase 22 — Fix: AI Trainer claims "no context" (2026-11-08)
Root cause confirmed by investigation, not assumed: Training Room never
touches `src/lib/mcp/activeRecord.ts`, so the Trainer's system prompt gets
zero textual hint a roleplay transcript exists — unlike a tagged
Performance Review record, which `build_tagged_context` names explicitly.
The Trainer's only path to that content was deciding, completely
unprompted, to call `get_roleplay_transcript`, and `TOOL_USE_RULE` never
even mentions that tool.
- [x] New `knowledge/prompt.rs::build_training_context(training_session_id:
      Option<&str>)` — same job `build_tagged_context` does for Performance
      Review records, but unconditional on `Some` rather than keyed to
      anything the user did in the UI (a Trainer pane is always exactly
      one training session, no ambiguity to resolve). Names
      `get_roleplay_transcript`, anchors "here"/"this call"/"this
      conversation", and explicitly forbids claiming no context exists.
- [x] `build_augmented_system_prompt` gains a `training_session_id`
      param, threaded through from `ask_agent`'s existing
      `training_session_id`. 4 new unit tests.
- [x] `cargo test` (30 passing) / `npm run build` / `lint` / `tsc
      --noEmit` clean; `.app` rebuilt and reinstalled.

### Phase 23-27 — Persona/assumptions redesign + real-transcript grounding (2026-11-08)
User-dictated correction after using Phase 17-19's first pass: Assumptions
were conflating two different things. Re-split:
- **Persona** (hidden from the trainee entirely — not shown anywhere in
  the UI): who they are, their background/situation, and *how* they tend
  to communicate — response length (short/closed vs long/open), emotional
  openness, language style, and limiting beliefs (some they're aware of,
  some they aren't). Built once, grounded in a real past call when
  possible rather than invented from nothing.
- **Assumptions** (trainee-visible/editable, unchanged UI): facts about
  *this call*, not the persona — "we've already built trust," "they came
  in from a Facebook ad," "they know why they're on this call," "they're
  coming in fairly open." Technical/situational, not personality.
- **Hero's description** stops being persona bio — it's a training
  objective reminder (what we're practicing and why), since the persona
  is deliberately invisible.
- **Thoughts** stop being the persona's own first-person voice — they're
  the roleplay AI's third-person *meta*-analysis: given this persona's
  known patterns, how would they likely respond right now, and what do
  they probably feel. Never the character's own internal monologue.
- **"Next Session"** can now actually adjust the persona (difficulty,
  characteristics, conversation direction) to target what the trainee
  needs to practice, not just emit a flavor phrase on top of a frozen
  persona.
- A visible "thinking" indicator while waiting on a reply (there was
  none before — the composer just silently disabled).

#### Phase 23 — Data model (2026-11-08)
- [x] New `Persona` type (`ChatRoleplaySession.data.ts`): `name`,
      `background`, `responseLength: "short"|"long"|"mixed"`,
      `emotionalOpenness: "guarded"|"moderate"|"open"`, `languageStyle`,
      `limitingBeliefs: string[]`, `sourceRecordId: string | null` (which
      real Performance Review record it was grounded in, if any).
- [x] `RoleplayState` gains `persona: Persona | null`, `trainingObjective:
      string`, `difficulty: "easy" | "medium" | "hard" | null`.
- [x] `ProposalCardData` gains `objective` (shown to the trainee — what
      we're training and why) and `difficulty`; `meta` stays a one-line
      *setting* string with no persona name in it anymore.

#### Phase 24 — Real-transcript-grounded persona + meta-thought rewrite (2026-11-08)
- [x] New `generate_persona` Tauri command (`roleplay.rs`), takes
      `app`/`active_space_folder` (like `ask_agent`, unlike the other
      roleplay.rs commands, since it needs to read real records): picks a
      real Performance Review record with a transcript — `difficulty:
      "hard"` → a `"failed"` call, else → a `"closed"` call (most recent
      match; `list_performance_reviews::list()` refactored to take a
      `root: &Path` param instead of always resolving the MCP-subprocess-
      only env var, so this main-process call can pass
      `spaces::records_dir` directly, a new helper) — then one model call
      extracts `name`/`background`/`responseLength`/`emotionalOpenness`/
      `languageStyle`/`limitingBeliefs` from a bounded (6,000-char)
      excerpt of that real transcript. No matching record at all → the
      same call falls back to inventing a persona consistent with the
      objective/difficulty, explicitly told so in the prompt. Verified
      by hand against the real CLI with a fake transcript: the extracted
      persona's response length/openness/beliefs genuinely tracked the
      transcript's actual behavior ("send me something in writing, I've
      been burned before" → `RESPONSE_LENGTH: short`, a limiting belief
      naming exactly that burned-before pattern).
- [x] `generate_setup_reply`'s proposal contract gains `OBJECTIVE:` and
      `DIFFICULTY:` labeled fields (parsed into the new `ProposalFields`,
      `DIFFICULTY` defaulting to `"medium"` if missing rather than
      failing the whole proposal).
- [x] `generate_roleplay_turn` restructured: takes a `PersonaFields` (plus
      call-context assumptions) instead of `scenario_title`/
      `scenario_meta`. The `THOUGHT` instruction changed from first-person
      persona voice to third-person meta-analysis — verified by hand: a
      real call against a Marcus-shaped persona returned "The trainee
      went straight for the wound... His limiting belief (admitting the
      mistake looks incompetent) and guarded style mean he'll deflect
      rather than open up" — genuine third-person analysis citing the
      specific pattern driving the prediction, not first-person feeling-
      talk.
- [x] `beginRoleplay` calls `generate_persona` once, right when the
      scenario locks, then opens round 1 with the real persona.

#### Phase 25 — "Next Session" can adjust the persona (2026-11-08)
- [x] New `generate_session_adjustment` command: given the finishing
      round's transcript + the training objective + the persona's current
      fields, returns both the trainee-facing phrase (unchanged meaning)
      *and* a persona (same shape as `generate_persona`'s output) — most
      fields usually unchanged, but free to shift difficulty/
      characteristics/conversation direction toward what the trainee
      needs next.
- [x] `nextSession()` replaces the current persona with the returned one
      before opening the new round — prior rounds' turns are historical
      record either way, unaffected by a persona change going forward.

#### Phase 26 — Frontend wiring + hide the persona (2026-11-08)
- [x] `ChatRoleplaySession.script.ts` updated end-to-end for the above;
      `heroSummary` is now `trainingObjective` (falling back to
      `scenarioTitle`), never persona text; nothing in the UI ever
      renders `persona` directly — `personaLabel` (used only as
      `RoleplayChat`'s speaker-name label, same job "You" does for the
      trainee) is the one place `persona.name` surfaces at all.
- [x] `ProposalCard` shows `objective` as its real description and a
      `Difficulty: X · <setting>` line instead of implying a persona bio.

#### Phase 27 — Visible "thinking" state (2026-11-08)
- [x] `RoleplayChat`/`SetupThread` show a lightweight three-dot pulsing
      indicator bubble while a reply is in flight (`isSendingTurn`/
      `isSendingSetup`), instead of just disabling the composer silently;
      auto-scroll effects extended to fire on that state too so the
      indicator is always in view.

- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `cargo check` /
      `cargo test` clean (34 passing); `.app` rebuilt and reinstalled.

### Phase 28 — Fix: AI Trainer narrates "let me check" and stops instead of calling the tool (2026-11-08)
User-reported, reproduced and fixed by hand against the real CLI + the
real MCP server binary (not just reasoned about) — see the harness below.
Root cause: Phase 22's `build_training_context` fix named the tool and
told the model to use it, but never told it *not to just announce
intent* — `TOOL_USE_RULE` already has that exact sentence for the
Performance Review tools ("actually invoke it... never describe or
simulate the call in prose instead"), but that sentence only names
`list_performance_reviews`/`get_performance_review`, so
`get_roleplay_transcript` got none of that protection.
- Repro harness: a fake `training/<id>/session.json` with a real round
  of turns, a real generated `--mcp-config` pointing at the actual
  release binary re-exec'd as the MCP server (`MASTERS_WHEEL_MCP_SERVER=1`
  + `MASTERS_WHEEL_TRAINING_SESSION_PATH` set to that fake session), and
  the exact system prompt `build_augmented_system_prompt` would produce.
  First run against the pre-fix wording: `num_turns: 1`, no `tool_use`
  content block at all, `result` = "Mrknu se na přepis tohoto rozhovoru,
  abych viděl, kde jsme skončili..." ("Let me check the transcript...")
  — a verbatim reproduction of the reported bug, not a guess.
- [x] `build_training_context` gained the same "actually call it through
  the real tool-calling mechanism in this same turn... a sentence
  announcing intent is never a substitute for really invoking it... never
  write out what a tool call would look like" language `TOOL_USE_RULE`
  already had for the other tools. Re-ran the identical harness against
  the fix: `num_turns: 2` (a real tool call happened), and the final
  answer genuinely quoted the fake transcript's actual lines back —
  confirmed twice, including once in Czech, matching how the user
  actually talks to the Trainer.
- [x] New regression test
  (`training_context_forbids_narrating_intent_instead_of_actually_calling_the_tool`);
  35 Rust tests passing. `.app` rebuilt and reinstalled.

### Phase 29 — Add Learning discipline (2026-11-09)
User-dictated: a 5th discipline, book icon, unlocked. Upload any video/
audio/PDF/EPUB; write notes "around" each upload the way you'd insert an
image into a Word doc and write underneath it — visually per-file, but
one single notes document in storage (`TrainingSession.learning`, not
one note field per file). A session-wide pin toggle keeps the newest
file's media fixed at the top of the Hero column while everything else
(older files + all notes text) scrolls beneath it. "Generate transcript"
(same plain/"with voice recognition" choice Voice Training already has)
moved into the Detail column instead of inline in the feed, for whichever
file is currently selected; a pdf/epub is store+download only — no in-app
preview, no text extraction (both explicitly deferred, see FEATURES.md).
- [x] New data model (`TrainingRoom.data.ts`): `LearningFileKind`/
      `LearningFile`/`LearningBlock`/`LearningState`, `TrainingSession.learning`,
      `emptyLearningState`/`parseLearningState` (same tolerant-parse shape as
      `parseRoleplayState`). New `learning` tool type, glyph, and
      `--color-discipline-learning` token.
- [x] Storage (`src/lib/training/index.ts`): `storeLearningFile` (delegates
      to the existing `storeClipFile` transcode/copy path for video/audio;
      plain copy+`size()` for pdf/epub — no transcode, never played back)
      and `downloadLearningFile` (the app's first "save a file back out"
      action — `save()` + `copyFile`, no existing precedent to reuse).
- [x] `TrainingRoom.script.ts`'s Voice-Training-only `generationByClip`
      generalized in place to `generationByMedia`, keyed by either a clip
      id or a Learning file id (never colliding — same `makeId()`) — the
      second real consumer of that exact job-tracking/transcribe pipeline,
      so it's shared rather than copy-pasted. New `addLearningFile(s)`,
      `updateLearningBlockText`, `toggleLearningPin`, `selectLearningFile`,
      plus the cross-column seek/time bridge (`registerLearningMediaSeek`/
      `reportLearningMediaTime`/`seekLearningMedia`/`learningMediaTime`) —
      the player lives in `LearningHero`, its transcript (and
      `LyricsTranscript`'s seek) renders in the sibling `LearningDetail`.
- [x] New `TranscriptPanel` (`TrainingRoom/children/`): the exact three-
      state "Generate transcript"/running-progress/error UI that used to
      be `ClipFeedItem`'s own inline markup, pulled out once
      `LearningDetail` became a second real consumer of it — both now
      render it identically instead of maintaining two copies.
      `ClipFeedItem` refactored to use it; no behavior change there.
- [x] New `LearningHero` (+ `children/LearningMediaItem`) and
      `LearningDetail` elements, wired into `TrainingRoom.tsx` alongside
      the existing per-discipline branches. `DisciplinePicker` gets a new
      `#i-book` hand-drawn crest in the same style as the other four.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean.
- [ ] Not yet click-through verified in the running app — this project's
      CLAUDE.md rules out browser automation here; a manual pass through
      uploading a video/pdf, pinning, writing notes, and generating a
      transcript in the real `.app` hasn't happened yet.

