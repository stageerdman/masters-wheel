# Spaces — v1

## Goal
Let the user create multiple isolated "Spaces" (one per product they sell, or
skill they're mastering). Each Space has its own Agents, Performance Review
records, and AI chat history — genuinely separate on disk, not a UI filter
over shared data. Switchable from a top-right control on the Main Menu page,
with a beautiful minimal icon per Space, a dropdown to switch, a "+" to
create (name + icon picker, lands you in the new empty Space immediately),
and right-click → delete (confirm by typing "delete").

Decided up front (user confirmed):
- Full real isolation now, not a later phase — Rust/TS storage paths get
  scoped per Space in this round.
- Switcher lives only on the Main Menu page's own top-right, not globally in
  `AppHeader` (which stays hidden on Main Menu as today).
- Icon set: a curated open icon library (detailed line/outline style),
  recolored to the app's palette — not hand-drawn custom icons.
- **Unified, visible root** (revised after initial research): every Space's
  Agents + chats + Performance Review records all live together under one
  real, Finder-visible folder — `~/Documents/Master's Wheel/<Space name>/`
  — instead of splitting Agents/chats off into the hidden Tauri app-data
  dir. The user explicitly wants to see Spaces as real folders in Finder.
  This is safe because moving an existing folder on the same volume is an
  O(1) rename, not a byte-copy — even large video files move instantly and
  atomically, so consolidating the *existing* default Space's data into its
  own subfolder carries the same low risk as the small-JSON moves below
  (with an `EXDEV` cross-device fallback to copy+delete, just in case).

## Current architecture (researched before writing this plan)
No shared "app root" helper exists today — three independent roots:

- **Agents**: `<app data>/agents/<id>/{agent.json,versions.json}` via
  `src/lib/agents/storage.ts` (`plugin-fs`, `BaseDirectory.AppData`).
  Knowledge files + per-agent `knowledge.db` (sqlite-vec) under
  `<app data>/agents/<id>/knowledge/`, owned by
  `src-tauri/src/knowledge/paths.rs`, exposed via the `ingest_knowledge_file`
  / `remove_knowledge_file` commands. The embedding model cache
  (`<app data>/embedding-model-cache/`) is shared infra, not per-agent data —
  stays global, not Space-scoped.
- **Performance Review records**: `~/Documents/Master's Wheel/<id>/...`,
  resolved **three separate times** in three separate ways that must stay in
  sync manually: frontend `src/lib/records/index.ts` (`plugin-fs`,
  `BaseDirectory.Document`), Rust MCP side `src-tauri/src/mcp/paths.rs`
  (hardcodes `$HOME` env var directly — no `AppHandle` available in that
  subprocess), and `lib.rs`'s media server spawn (`app.path().document_dir()`).
- **Chat sessions**: `<app data>/chats/<id>.json`, one flat file per session,
  `src/lib/chat/storage.ts`. Claude CLI's own native session ids
  (`claudeSessionIds`) live outside this app entirely — a new Space naturally
  gets fresh CLI sessions for free once chat session ids are Space-scoped,
  no extra work needed there.
- Agent photos are inline `data:` URLs inside `agent.json` — no separate file,
  no scoping concern.
- `localStorage` (frontend-only, not filesystem): AI Assistant dock position,
  Performance Review Detail/Hero panel state, `StatFilterBar` date/filter
  prefs. Treated as low-priority UI preference, not Space data — left global
  unless a phase below finds a concrete reason to scope one.

## Unified root layout
```
~/Documents/Master's Wheel/
  spaces.json                 <- registry: [{id,name,icon,createdAt}], activeSpaceId
  Default/                    <- existing data lands here on first migration
    agents/<id>/{agent.json,versions.json,knowledge/...}
    chats/<id>.json
    records/<id>/{meta.json,user_notes.md,ai_analysis.md,transcript.md,scorecard.json,hero.<ext>}
  <Second Space name>/
    agents/...
    chats/...
    records/...
```
Folder name = sanitized Space display name (not id) — chosen deliberately so
Spaces are legible in Finder, per the user's explicit ask. Tradeoff noted in
`wiki.md`: renaming a Space later would need a folder-rename step too; not
built now since rename isn't a requested feature yet.

## Phases

### Phase 1 — Spaces data model (additive, zero behavior change)
- `src/lib/spaces/`: `Space { id, name, icon, createdAt, folderName }`,
  registry at `~/Documents/Master's Wheel/spaces.json` (sibling to the Space
  folders, not inside any of them), holding `activeSpaceId` too.
- On first run (registry file doesn't exist yet): create `Default/`, move
  every existing top-level entry currently under `~/Documents/Master's
  Wheel/` (today's flat record folders) into `Default/records/`, move
  `<app data>/agents` → `Default/agents`, `<app data>/chats` →
  `Default/chats`. All moves are real filesystem renames (same-volume case)
  with copy-then-delete as an `EXDEV` cross-device fallback only — never
  delete-then-copy, so a crash mid-migration can't lose data. Write
  `spaces.json` last, only once every move succeeded.
- `SpacesProvider` React context (same shape as `HeaderActionsContext`),
  mounted in `src/app/layout.tsx`: `activeSpace`, `spaces`, `switchSpace`,
  `createSpace`, `deleteSpace`.
- A single shared TS path helper (`src/lib/spaces/paths.ts`) every other
  storage module calls for its root — the thing that didn't exist before and
  caused the 3-separate-hardcodes problem in Performance Review.
- Tests: registry CRUD, migration logic (including the EXDEV fallback path),
  "can't delete the last Space."

### Phase 2 — Scope Agents + Chat storage under the active Space's folder
Small JSON files — cheap and safe either way, done first to prove the
plumbing before touching records/video.
- Thread `activeSpace.folderName` through `src/lib/agents/storage.ts` and
  `src/lib/chat/storage.ts` via the Phase 1 path helper.
- Thread the same through `knowledge/paths.rs`'s helpers and the two
  knowledge Tauri commands (`ingest_knowledge_file` / `remove_knowledge_file`
  gain a `spaceFolder` argument from the frontend caller).
- Verify by running the app: existing agents/chat history appear under the
  auto-created "Default" Space; a newly created second Space starts with
  zero agents and zero chat history; switching back to Default restores
  everything untouched; a real chat still sends/receives (Claude CLI session
  plumbing itself is untouched, only its storage path moved).

### Phase 3 — Scope Performance Review records under the active Space's folder
This is where the hardcoded-in-3-places problem lived.
- Update `src/lib/records/index.ts` to resolve its root via the same Phase 1
  path helper instead of its own `BaseDirectory.Document` + fixed subpath.
- Update `mcp/paths.rs` to stop hardcoding `$HOME/Documents/Master's Wheel`;
  read the active Space's full records root from an env var the parent
  process sets before spawning the MCP server / Claude CLI subprocess
  (that subprocess has no `AppHandle`, so env var is the only channel in).
- Update the media server (`lib.rs` + `media_server.rs`) to resolve against
  the *currently active* Space's records root rather than one frozen at app
  launch — needed so switching Spaces mid-session doesn't serve a stale
  video path.
- Verify: open a video in Default Space, switch Spaces, confirm nothing
  stale plays; create a record in a new Space, confirm it's invisible from
  Default Space's Navigation list and lives under that Space's own
  `records/` folder.

### Phase 4 — Space switcher UI (Main Menu only)
- New element, Main Menu's top-right: trigger (icon + name) → dropdown
  listing all Spaces (icon + name) + a "+" row.
- Icon picker sourced from the curated open icon set, recolored via a new
  category-palette CSS var (consistent with how status/bookmark colors are
  already exempt from the core-5 budget).
- Create-Space modal: name + icon grid → create → immediately switches into
  the new (empty) Space.
- Right-click a Space row → context menu → "Delete Space" → confirm modal
  requiring the literal word "delete" typed in, matching this app's existing
  destructive-action precedent (Performance Review's "Remove record").
  Deleting the active Space switches to another remaining one first; the
  last remaining Space can't be deleted (disabled, with a tooltip why).
- UX passes on switcher/dropdown, create-modal + icon picker, and the delete
  flow get delegated to parallel UX-review agents before final styling,
  per this project's UX workflow convention.

### Phase 5 — Polish + tests + docs
- Tests for the path-scoping helpers and the migration logic from Phase 2.
- Update `FEATURES.md` (new "Spaces" section, Main Menu section notes).
- Update this folder's `wiki.md` with any decisions made along the way.

## Status
Phases 1–3 (data model, migration, Agents/chat/records scoping) and Phase
4 (switcher UI) done and verified — user confirmed the real migration ran
cleanly against their actual data, built into the installed `.app`. Phase
5 (tests) done for the riskiest logic (`spaces.rs`'s file-move helpers);
no new TS test framework stood up — see `wiki.md`. `FEATURES.md` updated.
Remaining: nothing blocking: this update can move to CLOSED once the
switcher UI itself gets a final look-over in the real app.
