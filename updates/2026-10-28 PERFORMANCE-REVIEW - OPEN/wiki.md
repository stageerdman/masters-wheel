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

## Scope discipline
- No real video upload, playback, transcription, or AI analysis — all four
  text types are fake/static or locally-editable only. Tracked in
  `FEATURES.md` at the project root as "to build."
- Search bar filters the already-loaded fake list client-side; no backend
  query.
