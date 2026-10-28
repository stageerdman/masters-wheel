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
- [ ] Add semantic CSS variables to `globals.css` (success/pending/info,
      muted-foreground, border, bookmark colors) and switch the app shell to
      a fixed-height layout (header + flexed content) so columns scroll
      internally instead of the page scrolling.
- [ ] `AppHeader` element (flat, reusable), wired into `layout.tsx` above
      `{children}`.

### Phase 2 — Shared bookmark primitive
- [ ] `BookmarkBadge` (flat): color + 2-letter badge, active/inactive state,
      click handler, optional drag passthrough props.
- [ ] `BookmarkRail` (flat): vertical stack of `BookmarkBadge`s, click-only
      selection. Used as-is by Hero; Detail builds its own richer version.

### Phase 3 — Page shell
- [ ] `PerformanceReview` element: 3-column grid (Navigation / Hero / Detail),
      fake video data fixture, lifts "selected video" state down to Hero and
      Detail.
- [ ] Wire into `src/app/page.tsx` inside `Canvas`.

### Phase 4 — Navigation column
- [ ] `SearchBar` (flat, reusable) — filters the list by title/date text,
      client-side only.
- [ ] `VideoListItem` (nested under Navigation) — activity-type icon (glyph +
      color), date row (muted/small), title row.
- [ ] Scrollable list, click selects a video for Hero/Detail.

### Phase 5 — Hero column
- [ ] `MediaPlayer` (flat, reusable) — fake static placeholder, no real
      playback.
- [ ] `BookmarkRail` instance switching Main text (read-only) / Transcript
      (clickable lines, fake seek — no-op) / Notes (editable) / Core Lessons
      (editable).

### Phase 6 — Detail column
- [ ] Detail-local draggable rail (`Detail/children/`): same 4 bookmarks +
      a draggable line in the same vertical list. Reordering a bookmark past
      the line's position splits the column into two independently-active
      text panes (top group / bottom group), each with its own active
      selection. `Detail.script.ts` holds the reorder/split state machine.

### Phase 7 — Tracking + verification
- [ ] `FEATURES.md` at project root: what's UI-shell-built vs still-to-build
      for this page (real transcription, AI analysis, lesson extraction,
      success/fail tagging, backend/storage, auth).
- [ ] Verify: `npm run dev`, click through list selection, bookmark
      switching, drag-split, search filter; `npm run build`.

## Decisions
(recorded as made — see `wiki.md`)

## Next
- Once this shell is in, future updates dictate: real upload flow, real
  transcription, AI analysis content, lesson-extraction logic, and backend
  storage — each its own update, each adding exactly one `FEATURES.md` row
  from "to build" to "built."
