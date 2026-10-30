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

### Phase 1 — registry + standalone widget + static grid (done)
- [x] `src/lib/statistics/` — statistic registry: id → `{ label, compute() }`,
      `compute` is `async` and reads real data. "Sessions this month" counts
      real on-disk records (`src/lib/records`) whose date falls in the
      current month; guarded by `isTauri()` so it stays empty outside the
      Tauri shell instead of throwing (same pattern as `PerformanceReview`).
- [x] `StatGrid` element — Control Center–style grid. Takes a list of slots
      (`statisticId` + optional `cols`/`rows`), looks up each statistic,
      renders a `StatWidget` per slot. Per-slot size travels as CSS custom
      properties (`--stat-cols`/`--stat-rows`) set by the grid on its own
      slot wrapper — same pattern as `--badge-color`/`--icon-color` — so a
      widget can span more than 1×1 without `StatGrid` or `StatWidget`
      needing a closed enum of size names. Also assigns each slot a
      `--stat-delay` so widgets cascade in individually instead of popping
      as one block.
- [x] `AnalyticsPanel` and `SidePanel` are fully transparent shells (no
      heading, no background/blur of their own) — just layout containers.
      `AnalyticsPanel` composes one real slot (`sessions-this-month`).
- [x] `SidePanel` grows from a fixed 20rem column to fill the remaining
      width next to `NavMenu` (flex: 1), so the grid has real estate.
- [x] Settled vocabulary — see `wiki.md`: Space (`StatSpace`) holds a Grid
      (`StatGrid`), a Grid is made of Slots (`StatSlot`), each Slot holds
      one Widget (`StatWidget`).
- [x] The glass-box look and the pop-in animation moved from the container
      down onto each `StatWidget` — every widget type gets this for free.
- [x] `StatWidget` is now a shell around a `children/` content component;
      the first content type is `SingleStat` (one value + label, centered
      dead-middle of the box) — see `wiki.md` for naming reasoning.
- [x] `StatGrid` always keeps an 8-cell buffer of empty slots beyond the
      real widgets, computed from actual content + measured column count
      — not scroll position, which regenerated forever (see `wiki.md`).
      `StatSpace` is just the scroll viewport: hidden scrollbar, a
      top/bottom fade mask so widgets dissolve at the edge instead of
      being hard-clipped.

### Phase 2 — multiple spaces (not started)
Deferred until a second space is actually dictated, per "elements get
dictated one at a time" — building page-switching UI with only one page to
switch to would be speculative. When it lands: `StatSpace` takes multiple
slot-lists (one Grid per Space) instead of one, plus minimal prev/next +
dot paging.

### Phase 3 — live edit mode (not started)
Long-press/edit-mode gesture, drag to add/remove/resize/reorder widgets.
Deferred per this phase's scope decision (architecture + static placement
first).

### Phase 4 — more widget types (not started)
A second `StatWidget/children/` content type (e.g. a chart) is what forces
`StatWidget` to actually pick between children instead of always rendering
`SingleStat` — deferred until that widget is dictated.

## Decisions
See `wiki.md`.
