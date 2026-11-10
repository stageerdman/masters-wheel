# Wiki — Performance Review page

Durable decisions and lessons from building the first real page.

## The page spec, as dictated
- **Header**: app-wide orientation, sits above all three columns, reusable
  across future pages.
- **Navigation** (left, narrow, fixed width): search bar on top, scrollable
  list below. Each row = one fixed-height item: activity-type icon (colored
  circle + glyph: green $ = successful sale, yellow → = "have to think about
  it", blue ● = training) on the left, two text rows on the right (date,
  small/muted; title, usually client name + detail like "John Frank (20k)")
  stacked to match the icon's height.
- **Hero** (middle, widest): title, one media element (not full width —
  margin on both sides), then a text area (same margin). The *right margin*
  next to the text area holds a vertical rail of bookmarks the user clicks to
  switch which text is shown: Main text (read-only), Transcript (lines
  clickable, scrub video — faked as a no-op for now), Notes (editable),
  Core Lessons (editable). Corrected 2026-10-28: originally built on the
  left; bookmarks belong on the right (book-tab metaphor — tabs stick out
  from the right edge of a page), and they sit flush against whatever edge
  they're nearest, no padding gap.
- **Detail** (right): same 4 bookmarks, also on the right edge (flush
  against the viewport edge here, since Detail is the rightmost column),
  but the rail is draggable. By
  default it behaves like Hero's single-pane rail. A thin horizontal line
  sits in the rail and can be dragged up/down the list; by itself it does
  nothing. Drag a bookmark below the line and the column splits into two
  independently-scrollable text panes — one for whatever's active above the
  line, one for whatever's active below. The bookmark **stays where
  dropped** (the rail is a real reorderable list, not a snap-back gesture) —
  this doubles as a way to just reorder the bookmarks even without splitting.

## Key clarifications from the user (2026-10-28)
- Drag-and-drop in Detail reorders the rail *persistently* — dragged
  bookmarks don't snap back. This is the same list acting as both "bookmark
  order" and "split boundary": model it as one ordered list containing the 4
  bookmark ids *and* a line sentinel, where position relative to the line
  determines top-group vs. bottom-group membership. Dragging anything
  (a bookmark or the line) is just a reorder of this one list.
- Bookmarks are **visually minimal by design**: a color + up to 2 letters,
  nothing more (no icons). Codes used: `MA` main, `TR` transcript, `NT`
  notes, `CL` core lessons. This is distinct from the Navigation list's
  activity icons, which *are* glyphs (dollar sign / arrow / circle) per the
  original spec — the "2 letters max" rule applies to bookmarks only.

## Element decisions
- `BookmarkBadge` (flat, reusable): the single color+2-letter visual unit.
  Takes active state, click handler, and passthrough drag props so both
  `BookmarkRail` (click-only) and Detail's local draggable rail can reuse the
  exact same visual without duplicating it.
- `BookmarkRail` (flat, reusable): vertical stack of `BookmarkBadge`, used
  directly by Hero. Detail does *not* reuse `BookmarkRail` itself — it needs
  the line-in-the-list reorder behavior, which is specific enough to live in
  `Detail/children/` per the "children only for truly one-off sub-elements"
  rule.
- Fake data lives in a single `PerformanceReview.data.ts` fixture file next
  to the page element — not part of the `Name.tsx/styles/position/script`
  convention, but there's no `src/lib/` yet and one small static fixture
  doesn't earn a new top-level folder. Revisit when real data arrives (this
  file gets deleted, not grown).
- App shell switched from a scrolling page (`body { min-height: 100% }`) to
  a fixed-height app shell (`body { height: 100vh; overflow: hidden }`) with
  internal scroll regions per column. Necessary once there's a persistent
  header + columns that each need their own scroll — a page-level scrollbar
  would fight the three independent scroll regions.

## Fixes after first look (2026-10-28)
- **Rail side**: flipped Hero's and Detail's bookmark rails from left to
  right, and dropped the padding on whichever edge the rail touches so the
  badges sit flush against it (Hero's own right edge; Detail's = the
  viewport's right edge, since it's the last column). Compensating
  `padding-right` was added to Hero's title/media rows only, so they still
  keep their own margin even though the rail column no longer has any.
- **Drag-and-drop didn't actually reorder**: the real bug was in the drop
  math, not the model. `SplitRail`'s drop handler always computed the
  insertion point as "before the hovered target," never "after" — so an
  item could never land past the line, which always sits last in the
  sentinel list. Fixed by reading `event.clientY` against the hovered
  target's own bounding-rect midpoint to decide before-vs-after, so dropping
  on the lower half of the line (or any badge) inserts after it. The
  sentinel-array model itself (`Detail.script.ts`) was fine — this was
  purely a caller bug in `SplitRail.tsx`. Also added
  `dataTransfer.setData(...)` on drag-start, which Chrome doesn't strictly
  require but some browsers do for a drop to fire at all.
- **Line look + cursor**: the line was a small rounded pill that read as
  just another badge/icon in the rail. Changed to a dashed, flat divider
  (no border-radius, no fill) with a short "tail" poking into the text
  column via a pseudo-element, so it visually previews the split boundary
  rather than looking like a control. Cursor is `row-resize` (the
  two-headed vertical arrow), matching the drag-to-reposition affordance.

## Correction: the sentinel-array model was the actual bug (2026-10-28)
The before/after drop-math fix above was real but insufficient — the
deeper problem was the model itself. Putting the line *inside* the same
reorderable list as the 4 bookmarks meant moving the line was implemented
as reordering that shared list, so from the user's point of view dragging
the line visually reshuffled the bookmarks (even though their relative
order never actually changed — the list just reflowed around the line's
new slot). It also meant the line could only ever rest at one of 5
discrete gaps, not "almost anywhere," which the user explicitly wanted.

Replaced with two fully independent pieces of state in `Detail.script.ts`:
- `order: ContentKind[]` — just the 4 bookmarks, reordered only by
  dragging a badge onto another badge (same before/after midpoint logic,
  now scoped to badges only).
- `linePx: number | null` — a continuous pixel offset, updated via
  real-time `pointermove`/`pointerup` window listeners started on the
  line's own `onPointerDown` (not HTML5 drag-and-drop, which only fires on
  discrete drop targets and can't track a smooth continuous position).
  `null` means "resting below all badges" (unsplit default).

Which badges are top/bottom is computed from fixed slot geometry
(`index * (badgeSize + gap) + badgeSize / 2`) compared against `linePx` —
pure arithmetic, no DOM measurement needed, since badges always render in
a fixed-height stack. The line is rendered absolutely-positioned
(`position: relative` wrapper, `top: linePx`) so moving it never touches
the badge stack's layout at all.

## Second correction: the line's range was still too small (2026-10-28)
The fix above clamped `linePx` to the *badge stack's* height (~136px) —
still wrong. The user's actual intent: one rail spans the Detail column's
*entire* height; the line is draggable across that whole range (e.g.
parked at the vertical middle of the screen) completely independent of
the 4 badges; dragging the line alone never touches the badges at all;
and only a deliberate drag of a *badge* past wherever the line currently
sits creates the split — the badge then visually attaches right under
the line.

Rebuilt once more, now with a clearer two-state design:
- `bottomKind: ContentKind | null` — at most one bookmark is "attached"
  below the line at a time (confirmed binary: one active above, one
  below). `topKinds` is simply the other 3, always in fixed canonical
  order — no bookmark-to-bookmark reordering, since nothing depends on
  their relative order once attach/detach is purely a top/bottom toggle.
- `linePx: number | null` — pixels from the top of the *rail*, which is
  sized to the Detail column's full height (`height: 100%`, measured via
  a ref + `getBoundingClientRect()`), not the badge cluster. `null` means
  resting at the very bottom (unsplit default) — rendered via CSS
  `bottom: 0` so no measurement is needed before the first drag.
- Both the line and the badges drag via the same real-time
  `pointerdown`/`pointermove`/`pointerup` mechanism (not HTML5
  drag-and-drop at all anymore). A dragged badge gets a `translateY`
  transform following the cursor without affecting layout; on release,
  comparing the cursor's position to the line's current position decides
  attach (below) vs. stay/return (above). Dragging the line only ever
  updates `linePx` — it has no path that touches `bottomKind`, so it
  structurally cannot move a badge.
- Once attached, the badge renders in its own absolutely-positioned slot
  pinned to `linePx + gap`, not inside the top badge stack — so dragging
  the line afterward (resizing) carries the attached badge and both text
  panes' proportions along with it (`topPane` gets `flex: 0 0 ${linePx}px`,
  bottom pane fills the remainder).

## Styling standards introduced (2026-10-29)
Audited every element's CSS for hardcoded colors/font-sizes while verifying
the Detail split-rail stayed minimal. Found 8 distinct literal font-sizes and
~10 distinct colors scattered across modules (some via named variables like
`--background`, some as bare hex like `#ffffff`). Consolidated into a single
token set in `globals.css`:
- Core UI palette, exactly 5: `--color-surface/text/text-muted/border/accent`
  (renamed from `--background`/`--foreground`/`--muted-foreground`/`--border`;
  `--color-accent` is new, replacing an ad-hoc reuse of the category color
  `--color-info` as a focus-ring color in `SearchBar`).
- Category palette (exempt — see CLAUDE.md "Styling standards" for why):
  `--color-status-*` (was `--color-success/pending/info`) and
  `--color-bookmark-*`, plus a new `--color-on-chip` replacing the two bare
  `#ffffff` literals used for text sitting on a colored chip.
- Exactly 4 text sizes: `--text-size-heading/body/label/micro`, each mapped
  to one purpose (was 8 unrelated rem values, including a couple of
  implicit-default cases — e.g. `TextView`'s editable/read-only panels had
  no declared font-size at all and silently inherited the browser default).
Full rule and variable list now live in CLAUDE.md under "Styling standards" —
durable across updates, not just this one. Going forward, no element's
stylesheet may hardcode a color or font-size literal; it must reference one
of these variables or the set gets deliberately extended first.

## Header dynamic island architecture (2026-10-29)
`AppHeader` renders in `layout.tsx`, above `{children}` — it has no natural
way to see a page's state (e.g. "which video is selected, what's its call
state"). Rather than moving `AppHeader` into the page (breaking the
reusable-across-pages intent from Phase 1) or hardcoding Performance-Review
knowledge into `AppHeader`, added a small context module,
`AppHeader/AppHeader.context.tsx` (sibling file, same "doesn't fit the
Name.tsx/styles/position/script convention" exception as
`PerformanceReview.data.ts`). `HeaderActionsProvider` wraps `<AppHeader />`
and `{children}` in `layout.tsx`; a page calls `setIsland(...)` (via
`useHeaderActions`) to populate the dynamic island, and clears it on
unmount. The island's shape is generic (`stateOptions: {id, glyph, color,
label}[]`, `activeStateId`, `onStateChange`) — `AppHeader` and its children
know nothing about `CallState` specifically, so a future second page can
populate the island with a different option set without touching
`AppHeader`.

Tradeoff accepted: the island is empty for one render until the page's
`useEffect` fires (SSR has no island at all). Imperceptible in practice,
revisit only if it becomes visible.

## Call-state rename + standalone icons (2026-10-29)
The fake `activityType` field (`success`/`followup`/`training`) became
`state` (`CallState`: `closed`/`training`/`postponed`/`failed`), dictated
alongside the header's state-change dropdown — the dropdown needed the exact
same icon set already used by the Navigation list, so the glyph/color/label
mapping (`CALL_STATE_META`) moved out of `VideoListItem` into
`PerformanceReview.data.ts` as the one shared source, consumed by both
`VideoListItem` and the header's `StateMenu`. Added a `failed` state (red
✕) since the user's dictated list needed a 4th state with no existing
mapping.

Also changed the Navigation list icons from a colored circle+glyph chip to
a bare colored glyph (no background shape) — a direct user correction after
seeing the original chip version.

`--color-status-success/pending/info` renamed to
`--color-status-closed/postponed/training` to match the new vocabulary,
plus a new `--color-status-failed`. New category-exempt token
`--color-action-training-ground` (orange) added for the sword button —
treated as a genuinely new category (a header action, not a status or
bookmark) per CLAUDE.md's "add a new category color only when a genuinely
new category is dictated" rule, rather than reusing `--color-bookmark-notes`
(same hue, wrong category) or expanding the core-5 (the AI button reuses
`--color-accent` directly since blue was already the core accent).

## Background-noise filter on transcription (2026-11-10)
Real-world bug: a Performance Review transcript picked up the user's wife
talking in the background of a single-mic recording. `transcribe.rs` had no
denoise step at all at the time — raw extracted audio went straight to
ElevenLabs.

Fixed by running every track/clip extraction through ffmpeg's `arnndn`
filter (RNNoise) before upload — same mechanism `~/dev/transcriber` uses
(`track_separation.denoise_pcm`, model `bd.rnnn`). Deliberately scoped to
*this* filter only, not transcriber's much heavier mic-bleed/cross-track
subtraction system — that targets multiple open mics in one room with an
isolated reference track per speaker, which doesn't apply to "one mic also
picked up someone else nearby."

Two decisions made with the user, recorded here since they're easy to
re-litigate without context:
- **Model sourcing**: auto-download the model into the app's data directory
  on first use (`rnnoise.rs::ensure_model`), not a vendored/gitignored file +
  manual fetch script like transcriber's `scripts/fetch_rnnoise_model.sh`.
  Mirrors the precedent already in this codebase for the AI Assistant's
  embedding model (`knowledge/paths.rs::embedding_model_cache_dir`) — no
  new setup step, nothing to bundle into the `.app`.
- **No UI toggle.** Applied unconditionally to every extraction, no
  settings surface. The source file is never touched (only the temp
  extraction sent to ElevenLabs), so there's nothing destructive to guard
  with a toggle, and no evidence yet that any real recording needs it off —
  add a toggle only if that need actually shows up (see
  `feedback_generalize_on_second_consumer` in project memory for why this
  project waits for a second real need before adding controls).
- Any failure to resolve/download/apply the model is fail-open (filter
  silently skipped), matching transcriber's own "missing model → no-op"
  behavior — never blocks a transcription.
- Verified empirically (not just by reading code): downloaded the real
  model and ran the exact `-af aresample=48000,arnndn=m=...` chain against
  a synthetic ffmpeg source before shipping.

## Scope discipline
- No real video upload, playback, transcription, or AI analysis — all four
  text types are fake/static or locally-editable only. Tracked in
  `FEATURES.md` at the project root as "to build."
- Search bar filters the already-loaded fake list client-side; no backend
  query.
