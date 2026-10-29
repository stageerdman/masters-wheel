# PERFORMANCE-REVIEW — build the Performance Review page

**Date:** 2026-10-28
**Status:** OPEN

## Goal
Build the UI shell (no backend, no real AI/transcription, fake data only) for
the Performance Review page — the main surface for reviewing uploaded
performance videos: browsing past sessions, reading/writing notes and core
lessons, seeing a (fake) transcript, and laying out space for later AI
analysis. This is the first real page of the app; everything before this was
scaffold.

## Context
User-dictated spec (see `wiki.md` for the full breakdown). Page has a global
header plus three vertical columns: Navigation (video list), Hero (title +
media + switchable text), Detail (extra text space with a draggable
split-view). "No real functionality, no bigass styling" — this is about
proving the layout and interactions with fake data; AI analysis, real
transcription, backend storage all come later as separate dictated features.

## Roadmap

### Phase 1 — Shell plumbing
- [x] Add semantic CSS variables to `globals.css` (success/pending/info,
      muted-foreground, border, bookmark colors) and switch the app shell to
      a fixed-height layout (header + flexed content) so columns scroll
      internally instead of the page scrolling.
- [x] `AppHeader` element (flat, reusable), wired into `layout.tsx` above
      `{children}`.

### Phase 2 — Shared bookmark primitive
- [x] `BookmarkBadge` (flat): color + 2-letter badge, active/inactive state,
      click handler, optional drag passthrough props.
- [x] `BookmarkRail` (flat): vertical stack of `BookmarkBadge`s, click-only
      selection. Used as-is by Hero; Detail builds its own richer version.

### Phase 3 — Page shell
- [x] `PerformanceReview` element: 3-column grid (Navigation / Hero / Detail),
      fake video data fixture, lifts "selected video" state down to Hero and
      Detail.
- [x] Wire into `src/app/page.tsx` inside `Canvas`.

### Phase 4 — Navigation column
- [x] `SearchBar` (flat, reusable) — filters the list by title/date text,
      client-side only.
- [x] `VideoListItem` (nested under Navigation) — activity-type icon (glyph +
      color), date row (muted/small), title row.
- [x] Scrollable list, click selects a video for Hero/Detail.

### Phase 5 — Hero column
- [x] `MediaPlayer` (flat, reusable) — fake static placeholder, no real
      playback.
- [x] `BookmarkRail` instance switching Main text (read-only) / Transcript
      (clickable lines, fake seek — no-op) / Notes (editable) / Core Lessons
      (editable). Factored the 4-branch render into a shared `TextView`
      element so Hero and Detail don't duplicate it.

### Phase 6 — Detail column
- [x] Detail-local draggable rail (`Detail/children/SplitRail`): same 4
      bookmarks + a draggable line in the same vertical list. Reordering a
      bookmark past the line's position splits the column into two
      independently-active text panes (top group / bottom group), each with
      its own active selection. `Detail.script.ts` holds the reorder/split
      state machine.

### Phase 7 — Tracking + verification
- [x] `FEATURES.md` at project root: what's UI-shell-built vs still-to-build
      for this page (real transcription, AI analysis, lesson extraction,
      success/fail tagging, backend/storage, auth).
- [x] `npm run build` and `npm run dev` both clean; SSR HTML checked for
      correct structure/content. **Not verified**: no connected browser this
      session, so click-through of drag-reorder/bookmark-switch/search
      filter is still outstanding — do this before calling the page done.

### Phase 8 — Header dynamic island + Hero meta panel
- [x] `AppHeader` rebuilt as a 3-area grid (logo left / dynamic island
      centered / reserved right). Dynamic island is populated per-page via a
      new `HeaderActionsContext` (`AppHeader.context.tsx`), since `AppHeader`
      lives in `layout.tsx` above every page and has no direct access to a
      page's state.
- [x] Dynamic island: AI re-analyze (blue, inert for now) — state dropdown
      (center, live) — training-ground sword (orange, inert for now).
- [x] Renamed the fake `activityType` field to `state` (`CallState`: closed/
      training/postponed/failed) and centralized its glyph/color/label in
      `CALL_STATE_META`, shared by the Navigation list icons and the
      header's state dropdown so both read one source of truth.
- [x] Navigation list icons changed from a colored circle+glyph chip to a
      standalone colored glyph (no background shape).
- [x] `CurrencyCombobox` (flat, reusable): typeahead currency picker —
      type a code/name, arrow keys or Enter to select.
- [x] Hero: `MetaPanel` child (3-dot toggle under the title) — offered
      amount + currency, 200-char description. Description also drives the
      Navigation row's hover tooltip.
- [x] `npm run build`, `npm run lint`, `tsc --noEmit` all clean.
- [ ] **Not verified**: no connected browser extension this session — same
      gap as Phase 7. Click-through of the state dropdown, meta panel
      expand/collapse, and currency typeahead is still outstanding.

## Decisions
- Fixed a real bug while verifying: two CSS modules (`BookmarkRail`,
  `SplitRail`) had an empty or missing `.root` rule. Turbopack's CSS-module
  compiler drops empty rules entirely, so `styles.root` was `undefined` and
  rendered as the literal string `"undefined"` in `className`. Harmless
  visually (no rules to apply) but wrong — every element's styles file needs
  at least one real declaration under `.root`, not just the convention's
  bare minimum empty block.
- See `wiki.md` for the rest (drag/reorder model, bookmark visual language,
  fake-data fixture placement).

## Next
- Once this shell is in, future updates dictate: real upload flow, real
  transcription, AI analysis content, lesson-extraction logic, and backend
  storage — each its own update, each adding exactly one `FEATURES.md` row
  from "to build" to "built."
