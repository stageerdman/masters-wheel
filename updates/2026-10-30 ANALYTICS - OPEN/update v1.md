# Analytics — standardized statistics + Control Center–style grid

## Goal
Every future "add this as a stat" request should slot into one reusable
system instead of growing one-off panels: a statistic registry (the data),
standalone widget components (the display), and a grid that places widgets
like Apple's Control Center — minimal footprint by default, sized up when a
widget needs more room, organized into spaces. Lives in the Main Menu's
Analytics panel, which grows from a narrow fixed column into the whole right
side of the screen to give the grid real room.

## Phased roadmap

### Phase 1 — registry + standalone tile + static grid (this phase)
- [x] `src/lib/statistics/` — statistic registry: id → `{ label, compute() }`.
      Fake/static compute for now (no backend yet). Seeded with the 4
      statistics the old fake `AnalyticsPanel` hardcoded.
- [x] `StatTile` element — the standalone number statistic block. Fills
      whatever box it's given; knows nothing about grids or sizing.
- [x] `StatGrid` element — Control Center–style grid. Takes a list of slots
      (`statisticId` + optional `cols`/`rows`), looks up each statistic,
      renders a `StatTile` per slot. Per-slot size travels as CSS custom
      properties (`--stat-cols`/`--stat-rows`) set by the grid on its own
      slot wrapper — same pattern as `--badge-color`/`--icon-color` — so a
      widget can span more than 1×1 without `StatGrid` or `StatTile` needing
      a closed enum of size names.
- [x] `AnalyticsPanel` now composes `StatGrid` with its own slot list
      instead of hardcoding a 2-col grid of fake divs.
- [x] `SidePanel` grows from a fixed 20rem column to fill the remaining
      width next to `NavMenu` (flex: 1), so the grid has real estate.

### Phase 2 — multiple spaces (not started)
Deferred until a second space is actually dictated, per "elements get
dictated one at a time" — building page-switching UI with only one page to
switch to would be speculative. When it lands: `StatGrid` takes `spaces`
(array of slot-lists) instead of one flat `slots` list, plus minimal
prev/next + dot paging.

### Phase 3 — live edit mode (not started)
Long-press/edit-mode gesture, drag to add/remove/resize/reorder widgets.
Deferred per this phase's scope decision (architecture + static placement
first).

### Phase 4 — real data (not started)
Swap each statistic's fake `compute()` for a real query once there's an
actual session/record backend to query (see `LOCAL-RECORDS-BACKEND` update).

## Decisions
See `wiki.md`.
