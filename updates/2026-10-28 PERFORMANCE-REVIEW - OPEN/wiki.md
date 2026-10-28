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
  margin on both sides), then a text area (same margin). The *left margin*
  next to the text area holds a vertical rail of bookmarks the user clicks to
  switch which text is shown: Main text (read-only), Transcript (lines
  clickable, scrub video — faked as a no-op for now), Notes (editable),
  Core Lessons (editable).
- **Detail** (right): same 4 bookmarks, but the rail is draggable. By
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

## Scope discipline
- No real video upload, playback, transcription, or AI analysis — all four
  text types are fake/static or locally-editable only. Tracked in
  `FEATURES.md` at the project root as "to build."
- Search bar filters the already-loaded fake list client-side; no backend
  query.
