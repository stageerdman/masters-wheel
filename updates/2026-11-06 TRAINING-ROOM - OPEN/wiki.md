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

## Clip files are real storage; session metadata still isn't
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

What's still fake: the *session list itself* (name, status, notes, which
clips belong to it) is still plain in-memory React state — reloading the
page or restarting the app resets it to `INITIAL_SESSIONS`, same as before.
Only the clip *files* on disk are now real and will outlive a reload even
though the session that references them won't (yet) remember they're
there. Removing a session now also deletes its real `training/<id>/`
folder (`removeSessionStorage`), so clip files don't orphan on disk.

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
