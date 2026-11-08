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
- [x] `ContextMenu`: `ContextMenuItem.destructive?: boolean` →
      `tone?: "destructive" | "positive"` (adds a green "close" affordance
      via the existing `--color-status-closed` token — no new core color).
- [x] `BookmarkBadge`: drop the hardcoded `ContentKind`/`BOOKMARK_META`;
      take a generic `kind` + `meta: { label, color }` instead.
- [x] `BookmarkRail`: generic over `kinds`/`metaFor`/`active`/`onSelect`
      instead of a fixed 5-kind `ORDER`.
- [x] Promote `SplitRail` out of
      `PerformanceReview/children/Detail/children/` to flat
      `src/elements/SplitRail/`, generalized the same way.
- [x] Move the split-state logic (`useSplitRail`, currently
      `Detail.script.ts`) into `src/lib/splitRail.ts`, parameterized by
      `kinds`/`storageKey`/`defaultActive` so each page keeps its own
      persisted layout under its own key.
- [x] Re-point Performance Review's `Hero`/`Detail`/`TextView` at the
      generalized primitives; `ContentKind`/`CONTENT_KIND_META` move into
      `PerformanceReview.data.ts` (page-specific metadata, same home as
      `CALL_STATE_META`). No visible behavior change for that page.

### Phase 2 — Page shell + Navigation
- [x] `TrainingRoom.data.ts`: `TrainingSession`/`TrainingClip` types,
      `TOOL_TYPE_META` (icon/color/label per tool type — just
      `voicePracticing` for now), fake in-memory fixture.
- [x] `TrainingRoom.script.ts`: in-memory session state (add/remove/
      close/reopen session, add clip, fake transcript generation) — no
      disk writes this phase.
- [x] `TrainingRoom` 3-column shell (mirrors `PerformanceReview.tsx`),
      wired into `src/app/training/page.tsx`.
- [x] Navigation column: pinned add-session item, Open/Closed grouping,
      `SessionListItem` (icon + editable name + relative-date via new
      `formatShortRelativeTime`), right-click menu (remove/close).

### Phase 3 — Hero (Voice Practicing feed)
- [x] Reuse `VideoUploadModal` (now accepting optional title/instructions
      text) for clip upload — accepts video or audio.
- [x] Clip feed: newest-first, each item = media player (video or audio)
      + optional "Generate transcript" + transcript slot.
- [x] New `LyricsTranscript` element: word-by-word highlight driven by the
      player's real `timeupdate`, word spans interpolated evenly across
      each (fake) transcript line's start/next-line-start window — a real
      interaction, just built on fake per-line timestamps this phase. See
      `wiki.md` for why this isn't real word-level data yet.

### Phase 4 — Detail (Notes)
- [x] `TrainingRoom`'s `Detail` reuses the generalized `SplitRail` +
      `useSplitRail`, seeded with a single `"notes"` kind under its own
      `training-room-detail-split` storage key.

### Phase 5 — Wire up + verify
- [x] `MainMenu`'s existing dormant `"training"` nav entry → `/training`,
      relabeled "Training Room".
- [x] `npm run build` / `lint` / `tsc --noEmit` clean.
- [x] `FEATURES.md` gets a new Training Room section.
- [x] Rebuild and reinstall the `.app`.

### Phase 6 — Follow-up fixes (2026-11-06, same day)
- [x] Hide the native scrollbar in Hero's feed and `LyricsTranscript`'s
      scroll area (same treatment as `StatSpace`) — scrolling still works,
      the chrome just isn't needed in the main view.
- [x] Fix "last used" semantics: renamed `lastUsedAt` → `lastUpdatedAt`,
      dropped the bump on mere select/open, added a debounced bump on
      real content edits (notes text, adding a clip) — selecting a
      session in Navigation no longer reorders the Open Sessions group.
- [x] Fix real bug: an uploaded clip never actually played. Root cause —
      Tauri's asset protocol (what `convertFileSrc` needs) is scoped to
      `$DOCUMENT/Master's Wheel/**` (`tauri.conf.json`), and a file picked
      from anywhere else on disk is silently refused, so the `<video>`
      element never loads anything. Fixed by copying the picked file into
      real Space storage first (new `src/lib/training`, same
      cross-filesystem-copy pattern `src/lib/records` uses for hero
      files) before building its playback URL — see `wiki.md`. Session
      *metadata* (the list itself) is still in-memory only; only the clip
      *files* are real now.

### Phase 7 — Real session-metadata persistence (2026-11-08)
- [x] New `src/lib/training` exports (`listSessions`/`createSession`/
      `writeSessionMeta`/`deleteSession`/`clipAbsolutePath`), same
      meta.json-per-folder shape as `src/lib/records`: each session's
      folder (`training/<id>/`, already real for clip files) now also
      holds `session.json` (toolType, name, status, lastUpdatedAt, notes,
      clip metadata).
- [x] `TrainingRoom.script.ts` loads real sessions on mount (dropped
      `INITIAL_SESSIONS`, same empty-until-real-data starting point
      Performance Review had before `src/lib/records`), debounces
      name/notes writes, writes immediately on status change/clip
      add/transcript generation, and deletes the whole session folder on
      remove (superseding the old clip-only `removeSessionStorage`).
- [x] `TrainingClip` gained `storedFileName` (the on-disk timestamped copy
      name) alongside the display `fileName`, so a reloaded session can
      rebuild each clip's `convertFileSrc` URL.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 8 — DisciplinePicker (2026-11-08)
- [x] Renamed the "tool type" concept to **discipline** in user-facing
      copy, and `voicePracticing` → `voiceTraining` (TrainingRoom.script.ts
      migrates a session.json written under the old name on load). Four
      disciplines now exist in `TOOL_TYPE_META`: **Voice Training** (real,
      unlocked), **Chat Roleplay**, **Voice Roleplay**, **Mindset
      Shifting** (all three locked/"coming soon").
- [x] Clicking Navigation's "Add a discipline" row no longer creates a
      session directly — it opens a new full-bleed `DisciplinePicker`
      takeover (dictated design: "Ironwork Portraits" — riveted metal
      frames, a torch per frame, carved nameplates; see `wiki.md` for the
      design pass this replaced). Selecting Voice Training plays a brief
      "ignite" confirmation, then creates the session and returns to
      Training Room, same as the old direct-create flow.
- [x] Four real states per `DisciplineFrame`: locked (dead wick, inert),
      available-idle (lit, flickering), hovered/keyboard-focused (brighter,
      lifts — locked frames deliberately don't react to hover at all), and
      confirming (the ignite flash). Escape and a click on blank space both
      close the picker without creating anything.
- [x] New `--discipline-*` token block in `globals.css` (documented,
      exempt from the core-5 the same way `--glass-*` already is) plus
      three new `--color-discipline-*` category colors — each discipline's
      own accent is blended into the shared orange ironwork chrome via
      `color-mix()` at a low ratio, so the picker reads as one lit world
      with a subtle per-discipline tint, not a tile per color.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 9 — DisciplinePicker redesign: gilded 3D flip cards (2026-11-08)
- [x] Replaced Ironwork Portraits' torch/bezel/plaque frames with gilded
      trading cards (dictated design pass, see `wiki.md`): each
      `DisciplineFrame` is now a full 3D object — `.flipInner` holds two
      complete card faces (front: icon medallion + name pill; back:
      description plaque) rotated 180° apart, so hovering spins the whole
      card, not just an inner window inside a frame that stayed put.
- [x] New card material: antique bronze/pewter metal with a cream
      secondary accent (dictated from a reference medallion image),
      replacing the old amber ironwork palette — new
      `--discipline-gold-1/2/3`, `--discipline-cream`, `--discipline-ink`,
      `--discipline-parchment-1/2` tokens in `globals.css`, same
      documented-exemption pattern as `--glass-*`. The picker's backdrop
      is now a neutral warm-black matching the app's real dark-mode
      surface family, not the previous blue-tinted navy.
- [x] Crests swapped to flat pictograms matching the new material
      (speaker for Voice Training, speech bubble for Chat Roleplay; mask
      and eye unchanged) plus new decorative symbols (corner scrollwork,
      4-point sparkles, a lock badge, a checkmark "confirming" badge) and
      a gold-foil `linearGradient` the icons/strokes paint with instead of
      a flat fill.
- [x] Fixed a real cross-card hover bug: the "other cards recede" effect
      must only fire when the pointer is over an actual card, not
      anywhere in the grid's own box (the gaps between cards count as
      "inside the grid" too) — `.grid:has(> button:hover) > button:not(:hover)`
      instead of a naive `.grid:hover` rule.
- [x] `npm run build` / `lint` / `tsc --noEmit` clean; `.app` rebuilt and
      reinstalled.

### Phase 10 — Fix WebM clips not playing (2026-11-08)
- [x] Root cause confirmed empirically (not assumed): WKWebView/Safari on
      macOS has never supported WebM's codecs (VP8/VP9 video, Opus/Vorbis
      audio) — the file stored and resolved to a playable URL correctly,
      the `<video>` element just couldn't decode it, showing its native
      broken-media icon. See `wiki.md` for how this was verified.
- [x] New `src-tauri/src/transcode.rs` (`transcode_to_mp4`, shelled out to
      ffmpeg, same pattern as `transcribe.rs`) re-encodes to H.264/AAC MP4.
      `storeClipFile` (`src/lib/training`) now transcodes instead of
      copying when the source extension is webm/mkv/avi/flv/wmv; mp4/mov/
      m4v are untouched.
- [x] `npm run build` / `lint` / `tsc --noEmit` / `cargo check` clean;
      `.app` rebuilt and reinstalled.
