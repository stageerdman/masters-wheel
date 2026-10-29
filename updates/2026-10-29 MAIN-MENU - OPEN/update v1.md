# Update v1 — Main Menu

## Goal
Give the app a real front door. Today the only page is Performance Review,
mounted directly at `/`. This update adds a Main Menu page at `/`, moves
Performance Review to its own route, and wires the global header's
wordmark to act as the "go home" link, swapping its label/logo per page.

## Spec, as dictated
- Clicking the header wordmark (currently static "Master's Circle" text)
  navigates to the new Main Menu.
- Main Menu is minimal: a big wallpaper fills most of the screen, a menu
  list sits on the left, a panel on the right starts empty.
- Menu has exactly 4 items: Performance Review, Analytics, Training, Chat
  with AI.
- Keyboard: arrow up/down moves the highlighted item, Enter activates it.
  Mouse: hover highlights, click activates — same effect as keyboard.
  The highlighted item gets a visible marker (e.g. an arrow) next to it.
- Performance Review activation navigates to the existing page. On that
  page, the header wordmark changes from "Master's Circle" to
  "Performance Review" and gains the project logo to its left.
- Analytics activation doesn't navigate anywhere — it fills the
  previously-empty right panel with fake analytics content.
- Training and Chat with AI are listed but inert for now (no behavior
  dictated yet) — same precedent as the header's existing inert buttons.

## Roadmap

### Phase 1 — Header becomes brand-aware
- [x] Extend `AppHeader.context.tsx` with a `brand` slot (label + whether to
      show the logo), same shape as the existing `island` slot — a page
      pushes its brand up, `AppHeader` has no direct page access.
- [x] `AppHeader` wordmark becomes a link home (`/`); renders the logo next
      to it when the active page's brand requests it.
- [x] `PerformanceReview` sets brand to `{ label: "Performance Review",
      showLogo: true }` on mount, clears it on unmount (mirrors how it
      already manages `island`).
- [x] Logo asset moved into `public/`.

### Phase 2 — Routing split
- [x] New route `src/app/performance-review/page.tsx` hosts the existing
      `PerformanceReview` element (unchanged behavior, new URL).
- [x] `src/app/page.tsx` now hosts the new `MainMenu` element instead.

### Phase 3 — MainMenu element
- [x] `MainMenu` (root element under `src/elements/`): wallpaper background
      filling the screen, left `NavMenu`, right `SidePanel`.
- [x] `NavMenu` (child): the 4-item list; arrow keys move a highlighted
      index, Enter activates; items are also mouse-hoverable/clickable.
      Highlighted item shows an arrow marker.
- [x] `NavMenuItem` (nested child of `NavMenu`): single row, visual
      standard for highlighted/idle.
- [x] `SidePanel` (child): empty by default; hosts `AnalyticsPanel` once
      Analytics is activated.
- [x] `AnalyticsPanel` (nested child of `SidePanel`): static fake stats —
      UI shell only, no real analytics.
- [x] Wire activation: Performance Review → `router.push`, Analytics →
      show `AnalyticsPanel`, Training/Chat with AI → inert.

### Phase 4 — Verify
- [x] `npm run build`, `npm run lint`, `tsc --noEmit` clean.
- [ ] **Not verified**: no connected browser extension this session (same
      gap noted in the Performance Review update) — click-through of
      keyboard nav + Enter, mouse hover + click, and the header wordmark
      round-trip (Main Menu → Performance Review → back) is still
      outstanding. Confirmed via SSR HTML inspection that both routes
      render, the wordmark link points at `/`, and all 4 menu labels are
      present.
- [x] Update `FEATURES.md` with a Main Menu section.

## Decisions
- `AppHeader`'s brand (wordmark label + logo) is client-state pushed up
  via `HeaderActionsContext`, same mechanism as the existing dynamic
  island. Consequence: like the island, the raw SSR HTML always shows the
  default "Master's Circle" — the swap to "Performance Review" happens on
  the client after hydration. This matches an already-accepted tradeoff in
  this codebase, not a new gap.
- Wallpaper and panel "glass" backgrounds use `color-mix(in srgb, var(--color-*) X%, transparent)` instead of new hex tokens — stays inside the
  "always reference the variables" rule while allowing translucency.

## Next
Training and Chat with AI stay inert until their own update dictates what
they do.
