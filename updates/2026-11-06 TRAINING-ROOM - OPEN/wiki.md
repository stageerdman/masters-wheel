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

## Why clips aren't real storage yet
Phase 1 here is explicitly UI-shell-only, same as Performance Review's own
first phase — but "fake" only means *no disk persistence* (nothing survives
a reload). Uploading itself is real: `VideoUploadModal` already opens a
real native file picker / accepts a real Tauri drag-drop path with no
extension filtering, so it's reused as-is (just with configurable title/
instructions text so its copy can say "clip" instead of "video"). Real
storage (writing clips into a Space's `training/<id>/` folder, same pattern
as `records/<id>/`) is a later phase once the UI shape is confirmed.

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
