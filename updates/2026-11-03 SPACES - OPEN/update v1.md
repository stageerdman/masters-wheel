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

## Phases

### Phase 1 — Spaces data model (additive, zero behavior change)
- `src/lib/spaces/`: `Space { id, name, icon, createdAt }`, registry file at
  `<app data>/spaces.json` (lives *outside* every Space folder — it's the
  thing that lists them), holds `activeSpaceId` too.
- On first run, auto-seed a `default` Space in the registry pointing at
  today's existing data (no files moved yet — that's Phase 2/3).
- `SpacesProvider` React context (same shape as `HeaderActionsContext`),
  mounted in `src/app/layout.tsx`: `activeSpace`, `spaces`, `switchSpace`,
  `createSpace`, `deleteSpace`.
- Nothing else changes yet — this phase is pure data model, testable in
  isolation.
- Tests: registry CRUD, default-seeding, "can't delete the last Space."

### Phase 2 — Scope Agents + Chat storage per Space
Small JSON files — cheap and safe to move.
- Thread `activeSpaceId` through `src/lib/agents/storage.ts` and
  `src/lib/chat/storage.ts`: paths become
  `spaces/<spaceId>/agents/...` / `spaces/<spaceId>/chats/...`.
- Thread a `spaceId` param through `knowledge/paths.rs`'s helpers and the two
  knowledge Tauri commands.
- One-time migration on first run: move `<app data>/agents` →
  `<app data>/spaces/default/agents`, `<app data>/chats` →
  `<app data>/spaces/default/chats`. Copy-then-delete-source (never
  delete-then-copy), so a crash mid-migration can't lose data.
- Verify by running the app: existing agents/chat history still appear under
  the auto-created "default" Space; a newly created second Space starts with
  zero agents and zero chat history; switching back to default restores
  everything untouched.

### Phase 3 — Scope Performance Review records per Space
Higher risk: this is where the user's actual video files live, and the path
is hardcoded in three places today.
- **Default Space keeps today's root unchanged**: `~/Documents/Master's
  Wheel/` stays exactly as-is for the `default` Space — no bulk-moving large
  video files on first run. Every *new* Space created from here on gets
  `~/Documents/Master's Wheel/Spaces/<space-id>/` instead.
- Update `src/lib/records/index.ts` to resolve root by active Space (default
  = unscoped root, else = subfolder).
- Update `mcp/paths.rs` to stop hardcoding `$HOME/Documents/Master's Wheel`;
  read the root from an env var the parent process sets (based on active
  Space) before spawning the MCP server / Claude CLI subprocess, falling
  back to the legacy path if unset.
- Update the media server (`lib.rs` + `media_server.rs`) to resolve against
  the *currently active* Space's root rather than one frozen at app launch —
  needed so switching Spaces mid-session doesn't serve a stale video path.
- Verify: open a video in default Space, switch Spaces, confirm nothing
  stale plays; create a record in a new Space, confirm it's invisible from
  default Space's Navigation list and lives in its own subfolder.

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
Planning complete, confirmed with user before implementation. Not started.
