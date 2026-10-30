# Analytics — decisions

## Size travels as CSS custom properties, not a size-name enum
A widget's grid span (`cols`/`rows`) is set by `StatGrid` (the parent) as
inline `--stat-cols`/`--stat-rows` on the slot wrapper it renders, consumed
by `grid-column: span var(--stat-cols, 1)` etc. Same mechanism already used
in this codebase for per-instance dynamic values (`--badge-color` in
`BookmarkBadge`, `--icon-color` in `VideoListItem`). This was chosen over a
closed `"1x1" | "2x2" | ...` union so adding a bigger widget later is just
passing a different `cols`/`rows` number — no new CSS classes, no enum to
extend. `StatTile` itself never sees sizing; it just fills its box. This
also keeps the "parent owns child positioning" rule intact: `StatGrid`
decides the span, `StatTile` doesn't dictate its own placement.

## Registry lives in `src/lib/statistics/`, not inside an element
It's shared, non-UI, reusable data (a statistic's id/label/compute), the
same shape as `src/lib/records` and `src/lib/transcript`. Keeping it out of
`StatGrid`'s own folder means any future surface (a dedicated Analytics
page, Performance Review, etc.) can register/consume statistics without
reaching into another element's internals.

## The glass box lives on each StatTile, not the container
First pass put the glass look (blurred, semi-transparent surface) on the
outer panel and left StatTile a flat opaque block — backwards from what was
asked. The container (`AnalyticsPanel`, `SidePanel`) is now fully
transparent with no heading; every widget that joins the grid carries its
own glass-box identity and pops in on its own. `SidePanel`'s own animation
dropped from a scale+opacity "pop" to a plain opacity fade, so it no longer
visually competes with each tile's individual pop — the container is
inert, the tiles do the work. Each slot gets a `--stat-delay` (set by
`StatGrid`, same mechanism as `--stat-cols`/`--stat-rows`) so tiles cascade
in individually instead of arriving as one block.

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
