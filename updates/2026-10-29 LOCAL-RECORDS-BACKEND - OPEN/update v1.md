# Update v1 — Local records backend

## Goal
Replace Performance Review's fake in-memory fixture with real data on disk.
Each record becomes a real, human-readable folder containing a real hero
video file and `.md` documents the user can actually edit — this is the
first real backend logic in the app (everything before this was UI shell).

## Spec, as dictated
- Everything lives locally and should be easy to find/read outside the
  app too (plain folders, not a hidden app-support directory).
- Each Performance Review record gets its own folder: a hero media file,
  an attachments slot, and written documents saved as `.md`.
- When the user writes a note, a real `user_notes.md` is created.
- The old "main" text slot (bookmark badge labeled "MA") is dropped
  entirely and replaced by an "AI analysis" slot — same mechanism as
  notes (its own real `.md` file, editable inline), just a different
  badge/label ("AI" instead of "MA").
- New records can be created two ways, both producing the same result:
  1. Drag a file onto the app while on Performance Review.
  2. Click an "Add record" row — same visual language as the existing
     video list items, but with a `+` glyph instead of a date, always
     pinned as the last item in the list.

## Decisions
- **Storage root**: `~/Documents/Master's Circle/` — a plain Finder-visible
  folder, confirmed with the user over `~/Movies/...` or app-support.
- **Record folder = slug of `"<date> <title>"`**, e.g.
  `"2026-10-02 John Frank (20k)/"`. `/` and `:` get replaced with `-`
  (filesystem-unsafe); a name collision appends `" (2)"`, `" (3)"`, etc.
  The folder name itself *is* the record's id — no separate opaque id.
- **Folder contents**:
  - `hero.<ext>` — the video file, copied in and renamed to a predictable
    name (original extension kept, lowercased) so code never has to scan
    for it.
  - `meta.json` — structured fields that aren't prose: `title`, `date`,
    `state` (`CallState | null` — see below), `offeredAmount`,
    `offeredCurrency`, `description`.
  - `user_notes.md` / `ai_analysis.md` — created lazily: nothing is
    written to disk until the user actually types something non-empty;
    reading a record with no file yet just yields `""` in the UI.
  - `attachments/` — reserved convention, not created or exposed in the
    UI yet. Only the folder-structure placeholder exists; no attachment
    upload flow is built this round (wasn't dictated — flagged under Next).
- **`state` becomes nullable.** The 4 existing states (closed / training /
  postponed / failed) don't have a honest "just dropped in, unclassified"
  member, and inventing a 5th category color isn't warranted for what's
  really an absence of classification. A freshly created record starts
  with `state: null`; the icon renders neutral (muted dot, core palette,
  no new category color) until the user picks a real state from the
  header's existing state dropdown.
- **"Lessons" stays in-memory only, not persisted, this round.** It wasn't
  part of what was dictated (only notes + AI analysis were named as real
  `.md` files). Flagged under Next so it doesn't get silently forgotten —
  don't build `core_lessons.md` speculatively now.
- **Bookmark rename, not addition**: `ContentKind`'s `"main"` becomes
  `"ai"` throughout (`BookmarkBadge`, `TextView`, `SplitRail`, `Hero`'s
  default active tab). `--color-bookmark-main` is renamed to
  `--color-bookmark-ai` in `globals.css` — this is the same slot getting a
  truthful name, not a 5th category color.
- **Native plumbing**: Tauri's JS `fs`/`dialog` plugins for all disk
  access (no Next.js API routes — the frontend is a static export with no
  Node server at runtime). Drag-and-drop uses Tauri's window-level
  `onDragDropEvent` (native OS paths), not HTML5 drag events, since a
  sandboxed browser drop wouldn't hand back a real filesystem path.
  Capabilities/permissions scoped to `$DOCUMENT/Master's Circle/**` only
  — not broad filesystem access.
- Real video playback: `MediaPlayer` gets an actual `<video>` element
  pointed at the hero file via Tauri's `convertFileSrc`, replacing the
  static play-button placeholder.

## Roadmap

### Phase 1 — Native fs plumbing
- [x] Add `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`
      (JS + the matching Rust crates), register both in
      `src-tauri/src/main.rs`.
- [x] Add a capabilities file scoping fs read/write/mkdir/copy and dialog
      `open` to `$DOCUMENT/Master's Circle/**` only.
- [x] Confirm the asset protocol can serve files from that same scope so
      `convertFileSrc` works for hero video playback.

### Phase 2 — Data layer (`src/lib/records/`)
- [x] `listRecords()` — scan the storage root, one record per subfolder,
      parse `meta.json`, don't fail the whole list if one record's
      `meta.json` is missing/corrupt (skip it, don't crash the app).
- [x] `readDoc(id, "notes" | "analysis")` / `writeDoc(id, kind, text)` —
      lazy create-on-first-write semantics described above.
- [x] `writeMeta(id, partialMeta)` — merge + persist `meta.json`.
- [x] `createRecordFromFile(path)` — slugify, create the folder, copy the
      source file in as `hero.<ext>`, seed `meta.json` with
      `state: null`, today's date, title derived from the filename
      (strip extension, replace `_`/`-` with spaces).
- [x] Ensure the storage root exists on first run (`mkdir -p` equivalent).

### Phase 3 — Wire it into the UI
- [x] `PerformanceReview.data.ts`: drop `FAKE_VIDEOS` and `mainText`
      entirely (per its own "delete once real data arrives" comment);
      `VideoRecord.state` becomes `CallState | null`.
- [x] `PerformanceReview.tsx`: replace the `FAKE_VIDEOS` + `edits`-diff
      model with real loads/saves through the Phase 2 data layer
      (debounce writes on notes/analysis/meta changes).
- [x] Rename `"main"` → `"ai"` across `BookmarkBadge`, `TextView`,
      `SplitRail`, `Hero`; `TextView`'s `ai` branch becomes an editable
      textarea (mirrors the `notes` branch) instead of read-only `<p>`.
- [x] `globals.css`: rename `--color-bookmark-main` → `--color-bookmark-ai`.
- [x] Neutral/null state rendering in `VideoListItem` and the header state
      dropdown's "nothing selected yet" display.
- [x] New `AddRecordListItem` (child of `Navigation`, since it's only
      meaningful pinned at the end of that one list): same visual
      language as `VideoListItem`, `+` glyph instead of a date/color icon,
      always last, opens the native file dialog on click.
- [x] Drag-and-drop anywhere on the Performance Review page (while
      mounted) creates a record per dropped file and selects the first
      new one.
- [x] `MediaPlayer` plays the real hero file via `convertFileSrc`
      (fallback placeholder only if a record somehow has no hero file).

### Phase 4 — Verify
- [x] `npm run build` (static export) and `npm run app:build` both clean.
- [ ] Manually exercise end-to-end: drag a real video in, confirm the
      folder/files land correctly in `~/Documents/Master's Circle/`,
      confirm notes/AI-analysis edits round-trip through app restarts.
      **Not verified headlessly** — the built `.app` was launched and
      confirmed to run, but driving its UI (navigating to Performance
      Review, clicking "Add record", dropping a file) needs real mouse/
      keyboard input. `osascript`/System Events keystroke injection was
      attempted and rejected ("osascript is not allowed to send
      keystrokes"), and claude-in-chrome is browser-only and off-limits
      per CLAUDE.md regardless. Please exercise this by hand.
- [x] Update `FEATURES.md` (Performance Review section) to move the
      relevant bullets from "UI shell" to "real".

## Next (deliberately deferred, don't build yet)
- Persisting "lessons" as its own `.md` file.
- Attachments UI (upload/list/remove) — folder convention exists, no UI.
- Real transcript (would need actual transcription — separate update).
- Real AI analysis generation (this update only makes the slot *real and
  editable*; something has to actually write useful content into it later).
