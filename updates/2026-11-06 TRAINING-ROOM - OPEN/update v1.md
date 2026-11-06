# TRAINING-ROOM — build the Training Room page

**Date:** 2026-11-06
**Status:** OPEN

## Goal
Build the UI shell (no backend, no real transcription — fake/in-memory data
only) for Training Room: a practice space that mirrors Performance Review's
three-column layout almost exactly, but isn't tracked in performance.
Sessions here are scalable by "training tool" — the first tool is **Voice
Practicing**. Real storage/transcription wiring is a later phase, same
sequencing Performance Review itself followed (see
`updates/2026-10-28 PERFORMANCE-REVIEW - OPEN/`).

## Context
User-dictated spec (full breakdown in `wiki.md`). Same page shell as
Performance Review — Navigation / Hero / Detail — with these differences:

- **Navigation**: a pinned `+` ("add a new training practice") above the
  list instead of a trailing "Add record" row; sessions split into **Open
  Sessions** (sorted by recency of last use) and **Closed Sessions** below
  that; each row shows a fixed, non-user-editable type icon, an editable
  name, and a relative "last used" label (`1d`, `30d`, `1m`, ...). Right-click
  offers **Remove session** (destructive, deletes its media from storage
  too) and **Close session** (a green checkmark — the first non-destructive
  tone `ContextMenu` has needed).
- **Hero**: driven by the session's tool type. Voice Practicing starts with
  an empty "upload a clip" placeholder; each uploaded clip (video *or*
  audio) stacks into a scrollable, Facebook-feed-style list, newest on top,
  with an optional "Generate transcript" button per clip and a
  lyrics-style, word-by-word-synced transcript under it once generated.
  Dropping in another clip prepends to the feed.
- **Detail**: same drag-to-split rail mechanism as Performance Review's
  Detail, but seeded with a single content kind (**Notes**) for now, since
  Voice Practicing has nothing else to show there (the transcript already
  lives inline in the Hero feed).

Two decisions made with the user before starting (2026-11-06):
1. Clips support both video and audio in v1 (not video-only).
2. The split-rail mechanism (`BookmarkBadge`/`BookmarkRail`/`SplitRail`/
   `useSplitRail`) gets **generalized now** into a reusable primitive over
   an arbitrary kind list, rather than staying hardcoded to Performance
   Review's 5 content kinds — Training Room is a second real consumer
   today, not a hypothetical future one.

## Roadmap

### Phase 1 — Generalize the shared split-rail/context-menu primitives
- [ ] `ContextMenu`: `ContextMenuItem.destructive?: boolean` →
      `tone?: "destructive" | "positive"` (adds a green "close" affordance
      via the existing `--color-status-closed` token — no new core color).
- [ ] `BookmarkBadge`: drop the hardcoded `ContentKind`/`BOOKMARK_META`;
      take a generic `kind` + `meta: { label, color }` instead.
- [ ] `BookmarkRail`: generic over `kinds`/`metaFor`/`active`/`onSelect`
      instead of a fixed 5-kind `ORDER`.
- [ ] Promote `SplitRail` out of
      `PerformanceReview/children/Detail/children/` to flat
      `src/elements/SplitRail/`, generalized the same way.
- [ ] Move the split-state logic (`useSplitRail`, currently
      `Detail.script.ts`) into `src/lib/splitRail.ts`, parameterized by
      `kinds`/`storageKey`/`defaultActive` so each page keeps its own
      persisted layout under its own key.
- [ ] Re-point Performance Review's `Hero`/`Detail`/`TextView` at the
      generalized primitives; `ContentKind`/`CONTENT_KIND_META` move into
      `PerformanceReview.data.ts` (page-specific metadata, same home as
      `CALL_STATE_META`). No visible behavior change for that page.

### Phase 2 — Page shell + Navigation
- [ ] `TrainingRoom.data.ts`: `TrainingSession`/`TrainingClip` types,
      `TOOL_TYPE_META` (icon/color/label per tool type — just
      `voicePracticing` for now), fake in-memory fixture.
- [ ] `TrainingRoom.script.ts`: in-memory session state (add/remove/
      close/reopen session, add clip, fake transcript generation) — no
      disk writes this phase.
- [ ] `TrainingRoom` 3-column shell (mirrors `PerformanceReview.tsx`),
      wired into `src/app/training/page.tsx`.
- [ ] Navigation column: pinned add-session item, Open/Closed grouping,
      `SessionListItem` (icon + editable name + relative-date via new
      `formatShortRelativeTime`), right-click menu (remove/close).

### Phase 3 — Hero (Voice Practicing feed)
- [ ] Reuse `VideoUploadModal` (now accepting optional title/instructions
      text) for clip upload — accepts video or audio.
- [ ] Clip feed: newest-first, each item = media player (video or audio)
      + optional "Generate transcript" + transcript slot.
- [ ] New `LyricsTranscript` element: word-by-word highlight driven by the
      player's real `timeupdate`, word spans interpolated evenly across
      each (fake) transcript line's start/next-line-start window — a real
      interaction, just built on fake per-line timestamps this phase. See
      `wiki.md` for why this isn't real word-level data yet.

### Phase 4 — Detail (Notes)
- [ ] `TrainingRoom`'s `Detail` reuses the generalized `SplitRail` +
      `useSplitRail`, seeded with a single `"notes"` kind under its own
      `training-room-detail-split` storage key.

### Phase 5 — Wire up + verify
- [ ] `MainMenu`'s existing dormant `"training"` nav entry → `/training`,
      relabeled "Training Room".
- [ ] `npm run build` / `lint` / `tsc --noEmit` clean.
- [ ] `FEATURES.md` gets a new Training Room section.
- [ ] Rebuild and reinstall the `.app`.
