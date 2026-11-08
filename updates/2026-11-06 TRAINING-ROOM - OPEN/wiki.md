# Wiki — Training Room page

Durable decisions and lessons from building the second real page.

## The page spec, as dictated (2026-11-06)
Training Room is a practice space that's deliberately **not tracked in
performance** — a gym. Several training tools will exist over time; the
first is **Voice Practicing**. UI copies Performance Review's three-column
shell almost identically, with these differences:

- **Navigation** (left): a `+` pinned above the list ("add a new training
  practice"), then **Open Sessions** (ordered by recency of last use), then
  **Closed Sessions** below. Each row: a fixed type icon (comes with the
  session's tool type, never user-adjustable), a user-written name
  (defaults to something dynamic, e.g. derived from the first uploaded
  clip), and a relative "last used" label (`1d`, `30d`, `1m`, ...).
  Right-click: **remove session** (deletes its media from storage too) or
  **close it** (a green checkmark).
- **Hero** (middle): the main action area, shaped by the session's tool
  type. For Voice Practicing: empty placeholder → upload a video. Below the
  video, an optional "generate transcript" button; the transcript is
  word-by-word synced to playback, highlighting the word currently being
  spoken (lyrics-style, like Spotify's synced lyrics view). Dropping in
  another clip prepends above the existing one(s) — a scrollable feed, like
  a social feed, of videos/audios each followed by their own transcript
  view.
- **Detail** (right): same drag-to-split capability as Performance Review's
  Detail column; for Voice Practicing there's just Notes to show there
  today.

## Why the split-rail got generalized now, not deferred
Performance Review's `BookmarkBadge`/`BookmarkRail`/`SplitRail`/
`useSplitRail` were all written hardcoded to its exact 5 content kinds
(`ai | transcript | notes | lessons | scorecard`) — reasonable when there
was only one consumer. Training Room is a second real consumer today (even
though it only needs one kind, `notes`, right now), so generalizing is
fixing real duplication, not speculating about a future need. Asked the
user directly rather than guessing: confirmed generalize now over "ship
Training's Detail as a plain Notes box and generalize later."

The split: `BookmarkBadge`/`BookmarkRail` (flat, reusable) and the promoted
`SplitRail` (flat, reusable) now take `kind: string` + a caller-supplied
`meta: { label, color }` instead of importing a shared enum. The *content
kind values and their meta* (colors, labels, what each kind renders) stay
page-specific — Performance Review's `ContentKind`/`CONTENT_KIND_META`
moved into `PerformanceReview.data.ts`; Training Room defines its own
(today: just `"notes"`). The split *state machine* (`useSplitRail` — line
position, which kinds are pinned above/below, drag handling, localStorage
persistence) moved to `src/lib/splitRail.ts`, parameterized by
`kinds`/`storageKey`/`defaultActive` so each page's layout persists
independently under its own key.

## Session metadata is now real storage too (2026-11-08)
Phase 7 closed the gap the previous section describes: each session's
`training/<id>/` folder (already real for clip files) now also holds
`session.json`, written by the new `src/lib/training` functions
(`listSessions`/`createSession`/`writeSessionMeta`/`deleteSession`) — the
exact same meta.json-per-folder shape `src/lib/records` uses for
Performance Review records, down to the "missing/corrupt file is just
absent, not a crash" tolerance in `parseMeta`. `TrainingRoom.script.ts`
dropped its `INITIAL_SESSIONS` fixture entirely and now loads real sessions
on mount, same empty-start behavior Performance Review already has.

Writes split the same way Performance Review's script does: `renameSession`
and `onNotesChange` debounce (typing shouldn't hit disk or reorder the
Navigation list every keystroke), while status changes, clip adds, and
transcript generation write immediately since they're discrete events, not
continuous edits.

A clip's on-disk filename is timestamp-prefixed (to avoid collisions) and
differs from its display name, so `TrainingClip` gained a `storedFileName`
field (not shown anywhere in the UI) purely so a reloaded session can
rebuild each clip's `convertFileSrc` URL via `clipAbsolutePath` — the
display `fileName` alone isn't enough to find the file again.

## Clip files are real storage (2026-11-06)
Phase 1 shipped with clip playback going straight through
`convertFileSrc(pickedPath)` — and it silently didn't work. Root cause:
Tauri's asset protocol (what `convertFileSrc` needs to actually serve a
file to the webview) is scoped to `$DOCUMENT/Master's Wheel/**`
(`tauri.conf.json`'s `security.assetProtocol.scope`), and a file picked
from anywhere else on disk (which is almost always, since users pick from
Desktop/Downloads/wherever) is silently refused — no error, the `<video>`
element just never loads anything. Reported back as "I upload a video and
it's not saved, it resets to some default."

Fixed (2026-11-06) by adding `src/lib/training` — same cross-filesystem
copy pattern `src/lib/records` already uses for hero files
(`copyFile(sourcePath, destRelativePath, { toPathBaseDir: BASE_DIR })`):
copy the picked file into the active Space's real
`training/<sessionId>/` folder first, *then* `convertFileSrc` the copy's
absolute path. That puts it inside the allowed scope, so it actually
plays. Deliberately still uses `convertFileSrc`, not Performance Review's
local HTTP media server (`media_server.rs`) — that server exists
specifically to stream multi-gigabyte call recordings past
`convertFileSrc`'s whole-file-buffering limit; practice clips are expected
to be far smaller, so that tradeoff doesn't bite here.

At the time this fix shipped, the *session list itself* (name, status,
notes, which clips belong to it) was still plain in-memory React state —
see the "Session metadata is now real storage too" section above for how
that gap was closed. Removing a session deletes its real `training/<id>/`
folder, so clip files don't orphan on disk.

## Why the word-by-word highlight is real UI built on fake timing
This isn't faked at the interaction level — it's a real `<video>`/`<audio>`
element's real `timeupdate` driving a real per-word highlight. What's fake
is the *timing data* it highlights against: ElevenLabs' real transcription
(`transcribe.rs`) already returns per-word start/end timestamps
(`WordTiming`), but `src/lib/transcript/generate.ts` currently coalesces
them into speaker blocks and only the block's single start timestamp
survives serialization to `transcript.md` — word-level timing is thrown
away today, for every page, not just this one. Training Room's
`LyricsTranscript` approximates per-word spans by interpolating evenly
across each (fake, for now) line's `[start, next-line-start)` window. Wiring
real per-word sync later is a `generate.ts`/transcript-format change
(stop discarding `WordTiming`), not a Training Room-specific problem —
worth doing once, benefits any future transcript view that wants it.

## DisciplinePicker: from a mockup pass to the real element (2026-11-08)
Before building, three full-screen dark "cabinet-select" HTML mockups were
shown for feedback — a neon arcade marquee, warm backlit pillars (closest
to a reference screenshot the user sent), and riveted ironwork portrait
frames with a torch per frame. **Ironwork Portraits** won on "this reads as
a world, not a UI skin" — specifically that a lit-vs-unlit torch sells
available/locked without any text or icon needed. That's the one built for
real as `TrainingRoom/children/DisciplinePicker`.

Four real states per `DisciplineFrame`, not three: **locked** (dead wick,
inert — no hover reaction at all, by design, since you can't preview
something that isn't built), **available-idle** (lit, gently flickering),
**hovered/keyboard-focused** (brighter, lifts), and **confirming** — a
brief "ignite" flash that plays *before* the session actually gets created,
so the click reads as a deliberate action rather than an instant jump back
to Training Room.

Each discipline gets its own subtle accent color (new
`--color-discipline-*` category colors in globals.css), but the brief was
explicit: keep the shared orange ironwork chrome as the dominant read, not
a different-colored tile per discipline. Solved with `color-mix()` — each
frame's bezel/portrait/glow blends its own accent into the shared
`--discipline-ember-*`/`--discipline-bezel-*` tokens at a low ratio (14–22%)
rather than using the accent outright. Voice Training's "accent" is just
`--color-action-training-ground` reused, not a new color — it's already the
one real discipline's color everywhere else in Training Room.

**Lesson: let the parent conditionally mount, don't self-gate on an
`isOpen` prop, if you need to reset state on open.** The first pass had
`DisciplinePicker` always rendered with `if (!isOpen) return null` inside
(same shape as `VideoUploadModal`), and a `useEffect` that reset
`confirmingToolType` to `null` whenever `isOpen` became true — React's
`react-hooks/set-state-in-effect` lint rule correctly flagged that as a
cascading-render risk. Fixed by having `TrainingRoom.tsx` render
`{isDisciplinePickerOpen && <DisciplinePicker ... />}` instead: the
component only exists while open, so `useState(null)` is already correct
on every fresh mount and the effect no longer needs to reset anything
itself. Worth reaching for this pattern first for any future full-takeover
(not dimmed-content-modal) element with per-open-session state.

A pending "ignite" selection is cancellable: `choose()` schedules
`setTimeout(() => onSelect(toolType), 460)`, and the same effect's cleanup
clears that timer if the component unmounts first (Esc / blank-space click
mid-flash) — without that, a cancelled selection could still silently
create a session a moment after the screen was already gone.

## Ironwork Portraits replaced by gilded flip cards (2026-11-08, same day)
Ironwork Portraits (the torch/bezel/plaque design above) shipped, then got
replaced within the same day after seeing it live — "too digital and
modern," wanting something closer to Hogwarts Legacy's spell-select or
Warcraft III's race-select screens. Three more HTML mockup rounds followed
*outside* the real app (same `updates/` "research spike" pattern as any
new design direction) before anything got rebuilt for real:

1. **Arcade Marquee / Illuminated Pillars / Coach's Playbook** — three full
   dark takeovers. "Ironwork Portraits" (riveted metal frames, a torch per
   discipline) won on "reads as a world, not a UI skin."
2. **Trading cards** (a Hogwarts Legacy mod-select screenshot as the
   reference) — square tiles with a circular icon badge and a name,
   flipping on hover to reveal a description. First pass shipped with an
   empty grid: the flip wrapper was a `<span>` with `width/height: 100%`,
   which CSS ignores on non-replaced inline elements, so every card
   collapsed to a 0×0 box. Fixed by giving every structural wrapper an
   explicit `display` — carried forward into the real build as a hard
   rule (see `DisciplineFrame.position.module.css`'s own comment).
3. **Whole-card flip** — the first card build only flipped an inner
   "window" while a static gold frame sat around it; asked to make the
   *entire* card turn instead. Fixed by giving the front and back each
   their own complete frame (gold border + parchment panel + corner
   scrollwork + sparkles) and rotating both together inside one
   `transform-style: preserve-3d` wrapper, rather than one frame with a
   swappable content pane.
4. **Bronze over gold** — a reference medallion image (bronze/pewter metal,
   not bright yellow) drove a straight hex-value swap of the gold tokens;
   no structural change.

That fourth-round card design is what's real now (Phase 9) — Ironwork
Portraits' tokens were removed from `globals.css` outright rather than
left dangling, since nothing else in the app referenced them.

**Lesson: a naive `.container:hover .child:not(:hover)` sibling-dim rule
fires on empty space too.** `:hover` applies to an element whenever the
pointer is anywhere inside its own painted box — including gaps between
flex children, which belong to the container, not any child. The fix is
`:has()`: `.grid:has(> button:hover) > button:not(:hover)` only matches
once a `button` *descendant* is actually hovered, which gaps never are.
Worth defaulting to the `:has()` form for this pattern from now on, not
the simpler one that happens to look right until you move the mouse into
a gap.

## Element decisions
- Fake session fixture lives in `TrainingRoom.data.ts`, same pattern as
  `PerformanceReview.data.ts`'s original fixture before real records
  arrived — gets deleted, not grown, once real storage lands.
- `SessionListItem`/`AddSessionListItem` nested under
  `TrainingRoom/children/Navigation/children/` — same reasoning as
  Performance Review's `VideoListItem`/`AddRecordListItem`: visually
  specific to this one list, not reused elsewhere.
- `LyricsTranscript` nested under `TrainingRoom/children/Hero/children/` —
  specific to the Voice Practicing feed's playback-synced rendering, not a
  drop-in replacement for the existing line-click-to-seek `Transcript`
  element (which Performance Review keeps using as-is).
