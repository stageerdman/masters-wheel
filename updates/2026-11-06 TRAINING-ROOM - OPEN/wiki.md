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

## WebM clips showed the native "can't play this" icon (2026-11-08)
Reported as "I uploaded webm and it doesn't play, shows a crossed play
button" — that crossed-out icon is WKWebView's own broken-media glyph, not
anything this app renders. Root cause confirmed empirically (synthesized a
real VP9/Opus `.webm` with `ffmpeg -f lavfi` and `ffprobe`'d it): Safari/
WebKit on macOS plays `<video>` entirely through AVFoundation's OS-level
codec support, which has never included WebM's codecs (VP8/VP9 video,
Opus/Vorbis audio) — unlike Chrome/Firefox, which bundle their own
decoders. The file storage/playback-URL path (`storeClipFile`,
`convertFileSrc`) was working correctly the whole time; this was never a
bug in that pipeline, it's a platform codec gap.

Fixed by re-encoding at import time instead of trying to make WebM play:
`storeClipFile` (`src/lib/training/index.ts`) checks the source
extension against `TRANSCODE_EXTENSIONS` (webm/mkv/avi/flv/wmv — the
other classic non-web-friendly containers, not just webm) and, if it
matches, calls the new `transcode_to_mp4` Tauri command
(`src-tauri/src/transcode.rs`, same shelled-out-ffmpeg shape as
`transcribe.rs`) instead of `copyFile`, producing an H.264/AAC `.mp4`
that WKWebView can always play. Verified the actual ffmpeg invocation
against a real VP9/Opus test file before wiring it in — in → out codecs
confirmed via `ffprobe`, not assumed from the command string. Everyday
formats (mp4/mov/m4v) are untouched, so the common case isn't paying a
transcode cost it doesn't need.

## Chat Roleplay discipline — the dictated spec (2026-11-08)

Built this round as a **UI-shell prototype only** (local component state,
scripted/canned AI content, no persistence beyond what's noted below) —
the point was to settle the UX before any backend exists. The design
process itself: 4 parallel "UX expert" agent passes (one each for setup/
confirmation, the hero header, the dual-layer thoughts chat, and the
detail sidebar), a synthesis pass reconciling the seams between them, then
a full interactive HTML Artifact prototype the user clicked through
*before* anything was built for real — only after that did the user ask
for this real-code pass, with several deliberate deviations from the
Artifact (listed below). Everything here is the spec to build real backend
behavior against later; nothing in this section describes code that
doesn't exist yet unless marked "(real now)".

### Setup → confirmation
A session starts as a plain chat: the user describes what they want to
train, the AI asks clarifying questions, then proposes a **Proposal
Card** — title, a meta line (persona/difficulty/setting), and an editable
checklist of **assumptions** (things the scenario takes as already true,
e.g. "assume rapport is already built" — these skip process the user
doesn't want to drill). Checkboxes accept/reject each row; row text is
click-to-edit; rows can be deleted or added. Sending another chat message
instead of confirming freezes the current card (labeled superseded, not
deleted — it stays in scrollback) and produces a new one reflecting the
refinement. A single confirm button locks it in. Before confirmation,
the screen shows a persistent **"Not set up yet"** indicator (a sticky
strip/banner) — the user explicitly asked for this: there must be an
unmistakable signal that the session hasn't started yet, distinct from a
live roleplay.

### The Hero / scenario header
Once confirmed, a header appears: the scenario's name, plus a clickable
disclosure ("N assumptions" / "Session details") that opens a popover
with the full AI-generated scenario description and the locked
assumptions — click-to-edit still works post-lock, but an edit is
recorded as an **amendment** (old value kept, not silently overwritten),
not full CRUD. This is the part the user specifically asked to be able to
click into after setup finishes, to review "what the AI generated out of"
the setup conversation.

### The roleplay chat — thoughts, revised twice
"Thoughts" are a second, hidden-by-default layer in the same transcript:
private commentary that the *roleplay* AI itself never sees, ever — not
even when the user is the one who wrote it. Two sources: the roleplay AI's
own inner monologue, and the user's own private annotations. The Artifact
prototype modeled these as a physically split composer ("Say this" /
"Think something" as two separate rows/sends) and rendered a thought
*after* the message it was attached to. **Both of those were explicitly
overridden once the user saw it live, in favor of:**

- **One composer, one send.** There's no separate "submit a thought"
  action — the user attaches a thought to the *same* message they're
  about to send (one input for the reply, a small toggle that reveals a
  second small field for the attached thought), and one Send dispatches
  both together as a single turn. The backend implication for later: the
  outgoing payload to the roleplay AI must carry only the reply text —
  the attached thought travels with the turn in storage/UI but is never
  part of what the roleplay model receives.
- **Thought renders above the reply, under the speaker's name — for
  both speakers.** Order per turn, when visible: speaker label → thought
  (if any) → the actual message bubble. This replaced the Artifact's
  reply-then-thought ordering.
- **One single visibility control, not three.** The Artifact's 3-state
  segmented control ("Dialogue only / +AI thoughts / +All thoughts") was
  explicitly rejected as too much UI for what it does — replaced with one
  eye-open/eye-closed icon button that shows or hides *all* thoughts
  (both sources) together. A message with a hidden thought still shows a
  tiny closed-eye glyph next to the speaker label as a quiet reminder one
  exists.

### "Next Session" — lesson carry-forward (new this round, not in the Artifact)
A button (near the Hero) that ends the current roleplay attempt and starts
a fresh one **under the identical locked conditions** (same scenario, same
assumptions) plus exactly **one short adjustment phrase** distilled from
the attempt that just ended — the dictated example: "next roleplay starts
with the absolute same conditions with one more single phrase or note
that can adjust the session." This round's prototype mocks the phrase
(picked from a small canned pool) rather than generating it from the real
transcript — that's the real-AI work for later. What resets vs. persists,
as dictated/inferred and worth keeping consistent once real:
- **Resets:** the roleplay transcript itself (back to the persona's
  opening line).
- **Persists unchanged:** the locked scenario + assumptions.
- **Accumulates:** the list of past adjustment phrases, one per session
  round, visible in the Hero's details popover (so the user can see the
  whole lineage of adjustments across attempts, not just the latest).
- **Persists independently of the roleplay reset:** the AI Trainer
  conversation and the Notes pane (see below) — they're coaching/record
  tools scoped to the training *session* record, not to one roleplay
  attempt inside it. Flagged here as an assumption, not something the
  user confirmed explicitly — worth double-checking before the backend
  bakes it in.

### Detail sidebar: real AI Assistant reuse + real Notes (real now)
Unlike the rest of this feature, the right-hand sidebar's top pane is
**not mocked** — it's a second, independent, always-open instance of the
real `useAIAssistant()` engine (same real local-`claude`-CLI backend,
same real agents/sessions on disk), docked inline instead of floating,
following the exact precedent `ChatPage` already set (its own
independent instance + reused `MessageList`/`Composer`/`AgentPicker`
components, unmodified). New `AIAssistant.context.tsx`
(`AIAssistantVisibilityProvider`/`useAIAssistantVisibility`, mirrors
`AppHeader.context.tsx`'s shape) lets any mounted component tell the
global floating `AIAssistant` to hide itself — `AITrainerPane` calls it
on mount/unmount, exactly so the floating widget and this docked instance
are never both on screen at once (the user was explicit about this: "make
sure... I don't see the AI assistant down below when I see it on the
top-right window"). The bottom pane is Notes, reusing the *same* real,
already-persisted `TrainingSession.notes`/`onNotesChange` every other
discipline's Detail already writes to disk — genuinely never readable by
any AI, including the Trainer pane right above it, which is a real
behavioral guarantee (not just copy) since the Trainer is a vanilla
`useAIAssistant()` instance with no code path that reads `session.notes`
at all.

The sidebar itself reuses `useSplitRail`/`SplitRail` exactly as every
other Detail column in the app does (drag a badge past the line to
split, same physics, same component) — extended `DetailContentKind` from
`"notes"` to `"notes" | "trainer"` and added a Chat-Roleplay-specific
`CHAT_ROLEPLAY_DETAIL_KIND_ORDER = ["trainer", "notes"]` in
`TrainingRoom.data.ts`, left Voice Training's own `DETAIL_CONTENT_KIND_ORDER`
(`["notes"]`) untouched. No "AI Trainer" persona/identity was invented —
it's literally whichever real Agent the user already picks, same
`AgentPicker` flow as anywhere else in the app; "Dana" (a fictional
trainer identity) was an Artifact-only placeholder, deliberately dropped
once this became real.

### What's still explicitly fake/scripted this round
The setup AI's clarifying questions, the Proposal Card's content, the
roleplay persona's dialogue + its "thoughts", and the Next Session
adjustment phrases are all canned content — one running example (a
cold-call opener against "Marcus Webb," a skeptical IT Director), same
as the Artifact. No real model call drives any of that yet; the real
`claude` CLI only powers the AI Trainer pane, because that's a straight
reuse of the already-real Assistant engine, not new roleplay-specific
model logic.

## Chat Roleplay discipline — round 2 revisions (2026-11-08, same day)

Seen live, the first pass's always-expanded Hero ("3 assumptions" footnote
+ summary + Next Session button all permanently visible) got replaced
with a single collapsed line, following the exact precedent Performance
Review's `Hero`/`MetaPanel` already set (a "•••" toggle + a panel that
only exists while expanded) — Chat Roleplay's version collapses to just
a **green dot + the scenario's name**, and *only* clicking that whole
line expands it. Specific decisions:

- **One shared name, not two.** The scenario's displayed name is now
  literally `TrainingSession.name` — the same field Navigation's
  `SessionListItem` already renders and lets you rename. Renaming from
  either place calls the same `onNameChange`/`renameSession`, so they can
  never drift. The Hero's own name span mirrors `SessionListItem`'s exact
  click-to-rename shape (a plain `<span onClick={stopPropagation →
  edit mode}>`, not a nested button) so clicking it doesn't also toggle
  the row's expand/collapse. The standalone `HERO_NAME` fixture constant
  was deleted outright once this landed — there was no other consumer.
- **The green dot reuses `--color-reviewed`** (already the app's "this
  has been handled/confirmed" green, used for Performance Review's
  reviewed flag) rather than a new token — same reasoning as every other
  category-color decision in this file: an existing color that already
  means "good/confirmed" fits this exactly.
- **Sessions became real rounds, not a reset-in-place counter.** The
  first pass's `turns`/`sessionRound`/`adjustmentPhrases` flat state
  couldn't represent "go back and look at an earlier attempt" — replaced
  with `rounds: SessionRound[]` (each with its own `turns`, the one
  `adjustmentPhrase` it started with, and a `report` generated the moment
  it stops being live) plus `activeRoundId` (which round is currently
  *displayed*, independent of which one is *live*). Only the last round
  in the array is ever live/interactive — dictated explicitly: "each time
  new session is created user cannot continue chatting in previous
  session, only observe it." `RoleplayChat` now takes `isReadOnly` and
  drops its composer entirely for any non-live round, showing a
  "Viewing Session N — read-only" bar with a "Jump to live session"
  button instead.
- **The expanded panel, top to bottom:** description (or the final
  report once generated, in its place — see below), the locked
  assumptions (unchanged from round 1: amend-not-overwrite edits), a
  **Sessions** list (one row per round — label, its carried-forward
  adjustment phrase if any, its report once generated, a "· Live" marker
  on the current one, a remove button on every *other* row as long as
  more than one round exists — the live round and the last remaining
  round can't be removed), then **Next Session** and, directly beneath
  it, a green **Generate final report** button. Both buttons only exist
  while the panel is expanded, per the dictated spec.
- **Generate final report** swaps the panel's description text for a
  generated summary (session count + each round's carried-forward
  adjustment, scripted/mocked the same way everything else here is) and
  back-fills a `report` for any round that didn't already have one
  (including the still-live round) — generating the report doesn't end
  the live round, it just means nothing is left unreported when looking
  back over the list. Clicking it again regenerates idempotently.
- **Still explicitly scripted:** a round's own report and the final
  report are both deterministic text built from turn counts and a small
  canned flavor-line pool (`ROUND_REPORT_FLAVOR_POOL`) — real per-round
  and final-report generation from the actual transcript is backend work
  for later, same as everything else flagged in the section above.

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
