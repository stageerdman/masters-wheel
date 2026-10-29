# Wiki — Local records backend

## Decisions
- Storage lives at `~/Documents/Master's Circle/`, not inside the app
  bundle or an app-support dir — the user explicitly wants to browse
  records in Finder like normal files.
- Folder name is the identity (no separate opaque id). Simpler, and
  matches "easily accessible and readable" — anyone looking at the
  folder in Finder sees exactly what the app sees.
- All disk access goes through Tauri's `fs`/`dialog` plugins from the
  frontend, not Next.js API routes — the frontend is a static export
  (see [[2026-10-29 NATIVE-APP - OPEN/wiki]]) with no Node server at
  runtime, so there is no server-side code to put routes in.
- Drag-and-drop uses Tauri's native `onDragDropEvent`, not HTML5 drag
  events — a browser `drop` handler only hands back `File` blobs in a
  sandboxed webview, not a real filesystem path, and we need the real
  path to copy the file into the record's folder.
- `state` is now nullable rather than inventing a 5th status category —
  keeps the category-color budget honest (CLAUDE.md: don't add a new
  category color except for a genuinely new category).

## Bugs found after shipping
- **Drag-and-drop (and the "+" button) silently did nothing.** Root cause
  wasn't drag-and-drop at all: `src-tauri/capabilities/records.json` only
  granted fs access to `$DOCUMENT/Master's Circle/**`, which covers the
  folder's *contents* but not the bare folder path itself. Every call
  started with `ensureStorageRoot()` → `mkdir("Master's Circle", ...)`
  against that exact path, which Tauri's ACL rejected — confirmed by the
  fact `~/Documents/Master's Circle/` had never once been created despite
  multiple app launches. The failure was swallowed by a bare `catch {}` in
  `addRecordsFromPaths`, so the user saw zero feedback. Fixed by adding
  the bare path (`$DOCUMENT/Master's Circle`, no `/**`) alongside the
  recursive glob for every `fs:allow-*` permission — standard Tauri
  pairing for "this directory and everything under it." Also replaced the
  silent `catch {}`s with `console.error` so a future failure like this
  is visible in devtools instead of looking identical to "nothing
  happened."
- Added actual visual drag feedback (dashed-border overlay, "Drop to add
  a record") driven by the `enter`/`over`/`leave` payload types that
  `onDragDropEvent` already delivers — `useRecordDrop` previously only
  acted on `"drop"` and ignored the rest.

## Open questions for later updates
- Attachments: folder convention (`attachments/`) exists but no upload
  UI yet — revisit when dictated.
- Lessons persistence: deliberately left in-memory only this round.
- How "AI analysis" actually gets generated (today it's just an empty
  editable `.md` a human can fill in by hand) — real AI wiring is a
  separate, later update.
