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

## Open questions for later updates
- Attachments: folder convention (`attachments/`) exists but no upload
  UI yet — revisit when dictated.
- Lessons persistence: deliberately left in-memory only this round.
- How "AI analysis" actually gets generated (today it's just an empty
  editable `.md` a human can fill in by hand) — real AI wiring is a
  separate, later update.
