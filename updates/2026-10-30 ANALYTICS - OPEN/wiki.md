# Analytics — decisions

## Filter architecture: shared data shape, shared popup, dynamic options
- **`src/lib/statistics/filters.ts` is the seam between UI and compute.**
  `StatFilterBar` produces a `StatFilters` value; every statistic's
  `compute(filters)` consumes it. Neither side knows about the other's
  internals — a statistic doesn't know chips exist, a chip doesn't know
  how any statistic uses its value. `DateRange`/`toIso`/`parseIso` moved
  here from `DateRangeFilter.script.ts` (where they first landed) once a
  second consumer (`src/lib/statistics`) needed the exact same shape —
  moving shared code out once there are 2 real consumers, not before.
- **`AnchoredPopup` + `useAnchoredPopup` got extracted once a 2nd, then
  3rd, 4th popup needed the identical shell and mechanics** (glass panel
  positioned from a chip's `getBoundingClientRect()`, scroll-to-dismiss
  that ignores scrolling *inside* itself via `data-anchored-popup`,
  Escape-to-dismiss). `DateRangePopup`, `SessionTypeFilterPopup`, and
  `AddFilterMenu` all just supply their own content now.
- **Session-type options are read live off Performance Review's own
  registry** (`CALL_STATE_ORDER`/`CALL_STATE_META` in
  `PerformanceReview.data.ts`), not a second hand-kept list — this is
  what "dynamic" meant: add or remove a call state there, this filter's
  options change with zero edits here. `src/lib/statistics/filters.ts`
  still only deals in raw `record.state` strings, not the `CallState`
  type itself, so `src/lib/statistics` doesn't have to depend on
  `src/elements/PerformanceReview` — only the UI-level `SessionTypeFilter`
  popup does, which is a reasonable place for that coupling to live.
- **A filter chip added via "+" starts as a no-op, not "matches
  nothing."** `passesSessionTypeFilter` treats an empty `values` array as
  "filter not actually active yet" regardless of mode — contains-nothing
  would otherwise vacuously exclude every record, which is the opposite
  of what "pops up empty, doesn't filter anything by default" asked for.
- **A statistic's `fixedFilters` override the global filter outright for
  that dimension — they don't intersect with it.** Meetings pins
  `sessionTypeFilter: { mode: "excludes", values: ["training"] }`; if the
  user separately adds their own session-type filter via "+", it simply
  has no effect on Meetings at all — `mergeFilters` replaces the whole
  `sessionTypeFilter` field, it doesn't combine the two rule sets. This
  is what was asked for ("if user adjusts Sessions filter in global it
  has no impact here"), and it's also simpler to reason about than a
  combined/intersected rule would be: a widget's own pin is either the
  final word on that dimension, or the global value is — never both.
- **The merge happens in `StatGrid`, once, right before `compute` is
  called — not inside each `compute` function.** This keeps every
  `compute` function uniform: it only ever reads `filters.dateRange`/
  `filters.sessionTypeFilter` as given, with no statistic needing to know
  whether a value in front of it came from the user or from its own
  definition. `countMeetings` no longer has a `record.state !==
  "training"` check in its body at all — that same exclusion is now
  entirely declarative data, not a special case in the compute logic.
- **New widgets apply the global session-type filter normally (no fixed
  filters of their own) unless one is actually dictated.** Closed/Closed
  amount/Real close rate/Close rate all already narrow to specific states
  as part of their own formula (e.g. Close rate only ever looks at
  closed/failed/not-qualified) — layering an unrelated global session-type
  filter on top is an accepted, if occasionally surprising, consequence
  rather than something these widgets needed to guard against; none of
  that was dictated, so none of it was added speculatively.

## Date-range filter: positioning, interaction, and deferred scope
- **No portal, plain `position: fixed`.** `DateRangePopup` renders inline
  in the React tree (inside `StatFilterBar` → `StatSpace`) rather than
  through `createPortal`. A `position: fixed` element escapes to the
  viewport regardless of DOM depth or an ancestor's `overflow`/`mask`,
  *unless* an ancestor has `transform`/`filter`/`backdrop-filter`/
  `perspective`/`will-change`/`contain` — none of `StatSpace`'s ancestors
  do (`StatWidget`'s `backdrop-filter` is a sibling branch, not an
  ancestor, so it's irrelevant here). This is the same backdrop +
  `position: fixed` technique `GenerateTranscriptModal`/`VideoUploadModal`/
  `TranscriptUploadModal` already use — no portal exists anywhere in this
  codebase, so this didn't introduce one either.
- **Close-on-scroll instead of repositioning.** The popup's `top`/`left`
  are computed once from the chip's `getBoundingClientRect()` when it
  opens. If the user scrolls the (scrollable, non-sticky) filter bar away,
  live-repositioning the popup to track it is unnecessary complexity —
  closing it instead is simpler and reads as intentional. Scroll is caught
  via a capturing-phase `window` listener (`addEventListener("scroll", fn,
  true)`), since the native `scroll` event doesn't bubble but capture-phase
  listeners still see it on the way down to any scrollable descendant.
- **Presets apply + close; calendar days update + stay open.** Clicking a
  preset is a complete action (Notion does the same) — apply and close.
  Clicking a calendar day only sets one end of a two-ended range, so the
  popup stays open for the other calendar; it closes via outside-click,
  Escape, or scroll.
- **Dates are "YYYY-MM-DD" strings end to end**, parsed via `Date.UTC`
  rather than `new Date(iso)` — same reasoning as `src/lib/statistics`:
  avoids local-timezone parsing shifting a day.
- **Week starts Monday**; year picker spans "current year − 100" to
  "current year + 1", scrollable, auto-scrolled to the active year on
  open — arbitrary but reasonable defaults, not dictated specifically.
- **Now wired into statistics** (see "Filter architecture" above) — this
  was deliberately deferred for one round, then picked up in Phase 5.

## Vocabulary
- **Space** (`StatSpace`) — one page of statistics. Holds one Grid today;
  the layer a future multi-page "swipe to the next screen" feature would
  extend, without `StatGrid` itself needing to know about paging.
- **Grid** (`StatGrid`) — the Control Center–style layout surface. Made of
  Slots; resolves each Slot's statistic value async and renders a Widget
  into it.
- **Slot** (`StatSlot`) — a placeable position within a Grid: which
  statistic, how many columns/rows it spans. Not a component — a plain
  data shape.
- **Widget** (`StatWidget`) — the standalone visual element that actually
  renders a statistic (today: a number). Fills whatever box its Slot gives
  it, carries its own glass-box look and its own pop-in animation. Future
  widget types (a graph, etc.) are new components with this same name
  pattern (e.g. a chart widget), not variants bolted onto `StatWidget`.
- `src/lib/statistics` stays a separate layer outside this hierarchy — it's
  the data (id → label + `compute()`) a Widget's value comes from, not a
  UI part.

## Size travels as CSS custom properties, not a size-name enum
A widget's grid span (`cols`/`rows`) is set by `StatGrid` (the parent) as
inline `--stat-cols`/`--stat-rows` on the slot wrapper it renders, consumed
by `grid-column: span var(--stat-cols, 1)` etc. Same mechanism already used
in this codebase for per-instance dynamic values (`--badge-color` in
`BookmarkBadge`, `--icon-color` in `VideoListItem`). This was chosen over a
closed `"1x1" | "2x2" | ...` union so adding a bigger widget later is just
passing a different `cols`/`rows` number — no new CSS classes, no enum to
extend. `StatWidget` itself never sees sizing; it just fills its box. This
also keeps the "parent owns child positioning" rule intact: `StatGrid`
decides the span, `StatWidget` doesn't dictate its own placement.

## Registry lives in `src/lib/statistics/`, not inside an element
It's shared, non-UI, reusable data (a statistic's id/label/compute), the
same shape as `src/lib/records` and `src/lib/transcript`. Keeping it out of
`StatGrid`'s own folder means any future surface (a dedicated Analytics
page, Performance Review, etc.) can register/consume statistics without
reaching into another element's internals.

## The glass box lives on each StatWidget, not the container
First pass put the glass look (blurred, semi-transparent surface) on the
outer panel and left the widget a flat opaque block — backwards from what
was asked. The container (`AnalyticsPanel`, `SidePanel`) is now fully
transparent with no heading; every widget that joins the grid carries its
own glass-box identity and pops in on its own. `SidePanel`'s own animation
dropped from a scale+opacity "pop" to a plain opacity fade, so it no longer
visually competes with each widget's individual pop — the container is
inert, the widgets do the work. Each slot gets a `--stat-delay` (set by
`StatGrid`, same mechanism as `--stat-cols`/`--stat-rows`) so widgets
cascade in individually instead of arriving as one block.

## StatWidget is a shell; widget types live in its children/
`StatWidget` owns only the shared chrome every widget type gets for free —
the glass box and the pop-in — and renders one `children/` component for
its actual content. The first (and so far only) content type is
`SingleStat`: centers one value + label dead in the middle of the box.
Named "Single" because the thing that will eventually sit next to it is a
widget showing more than one number at once (a trend, a chart) — the name
describes what's *in* the box, not that it's a widget (that's already
implied by living under `StatWidget/children/`). `StatWidget` doesn't yet
pick between multiple children — there's only one — that dispatch gets
built when a second widget type is actually dictated, same reasoning as
deferring multiple Spaces below.

## Row count is a function of content, not of scroll position
First pass grew the row count on every scroll event once within 3 rows of
the bottom. That's broken by construction: growing the bottom moves "near
the bottom" further away, so continuing to scroll always re-triggers it —
genuinely infinite, endlessly-regenerating blank space, correctly called
out as "stupid." Corrected version: `StatGrid` computes its own row count
directly as `ceil((occupied cells + 8) / columns)` — a pure function of
the real widgets (`slots`) and the grid's actual column count (measured
off the live DOM via `ResizeObserver` + `getComputedStyle`, since
`auto-fill` columns depend on container width). No scroll listener, no
incremental growth loop, nothing to re-trigger. It only grows when a real
widget is actually added and the 8-cell buffer gets eaten into — not from
scrolling past it. `StatSpace` dropped back to being a dumb scroll
viewport (no state, no `onScroll`): it just hosts whatever height
`StatGrid` decides it needs, with the native scrollbar hidden
(`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) and a
`mask-image` fade at the top/bottom edges so widgets dissolve away as they
scroll past the boundary instead of being hard-clipped by it.

## Statistics compute real data, async, gated on `isTauri()`
`compute()` is `() => Promise<string>`, not a sync fake string. Each
statistic's compute function calls into `src/lib/records` directly and
guards itself with `isTauri()` — same pattern `PerformanceReview.script.ts`
uses — so it stays empty (`"—"`) in the plain browser tab used for HMR
preview, where there's no fs bridge at all, rather than throwing. Fetch
lives per-statistic, not centralized, since future statistics may not need
Tauri/records at all. "Sessions this month" = records whose `date` field
falls in the current calendar month, compared as plain
year/month numbers (not `new Date(iso)`) to dodge UTC-parsing day-shift in
negative-offset timezones.

## Multiple spaces: deferred until a second space is actually dictated
`StatGrid` takes a flat `slots` list for now, not `spaces: Slot[][]`. Spec'd
the concept in `update v1.md` so the shape of the next change is known, but
didn't build page-switching chrome against a single page — there'd be
nothing to verify it against, and it contradicts "elements get dictated one
at a time, not pre-built."
