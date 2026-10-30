# Analytics — decisions

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

## Space grows downward: explicit row tracks + scroll-triggered growth
`StatGrid` no longer auto-sizes its rows (`grid-auto-rows`) — it reserves
an explicit number of row tracks (`grid-template-rows: repeat(var(
--stat-row-count), 6rem)`), most of which are empty. `StatSpace` owns that
count as state, starting at 6 rows, and is the thing that actually scrolls
(`overflow-y: auto`). On every scroll event it measures the *real* rendered
row height off the DOM (`scrollHeight / rowCount`) rather than duplicating
the `6rem` from CSS as a JS constant, and once the remaining scroll
distance drops under 3 of those rows, it adds 3 more. Net effect: the
bottom of the grid is never reachable — exactly "infinite downward."

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
