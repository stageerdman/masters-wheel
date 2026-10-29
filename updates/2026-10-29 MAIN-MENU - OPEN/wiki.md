# Wiki — Main Menu

## Why the header owns brand state instead of MainMenu/PerformanceReview
`AppHeader` lives in `layout.tsx`, above every route, so it has no direct
read access to whichever page is currently mounted. Phase 8 of the
Performance Review update already solved this exact problem for the
dynamic island (`HeaderActionsContext` / `setIsland`). The wordmark
label+logo is the same shape of problem, so it reuses the same context
instead of inventing route-based logic (e.g. reading `usePathname()` and
switching on it) — one mechanism for "a page configures the header."

## Why Performance Review moved to its own route instead of staying at `/`
The dictated spec is explicit: `/` is the Main Menu, and selecting
"Performance Review" from it *navigates* to the existing page. A page you
navigate to needs its own URL.

## Selection model in NavMenu
One `highlightedIndex` drives both keyboard and mouse: hovering an item
moves the highlight (same as pressing an arrow key), clicking activates it
(same as pressing Enter). This avoids two parallel selection concepts and
matches how the user described wanting both input methods to control "the
same" thing.
