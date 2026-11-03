# Spaces — wiki

Durable decisions and lessons from building Spaces, for future reference
once this update folder closes.

## Unified root, not a hidden-dir/Documents split
Originally planned to leave Agents/chats under the hidden Tauri app-data
dir and only scope Performance Review records per Space. Revised after the
user explicitly asked to see Spaces as real folders in Finder — now every
Space's Agents, chats, and records all live together under one real,
Finder-visible folder: `~/Documents/Master's Wheel/<folderName>/`. This
only works safely because moving an existing folder on the same volume is
a real filesystem rename (`std::fs::rename`), not a byte-copy — even large
video files move instantly and atomically. The one-time migration falls
back to a recursive copy-then-delete-source only on a genuine cross-device
move (`EXDEV`), which a same-machine move should never actually hit.

## Space folder name = sanitized display name, not id
Chosen deliberately so Spaces are legible in Finder (the whole point of
the unified-root decision above) rather than opaque folder names like a
UUID. Tradeoff: renaming a Space later would need its folder renamed too
— not built, since rename isn't a requested feature yet. If it ever is,
`src/lib/spaces/registry.ts` is where that logic would go (mirroring
`createSpace`'s `uniqueFolderName`).

## Migration lives in Rust, not TS, despite every other storage module
being plain TS/plugin-fs
The one-time move of `<app data>/agents` and `<app data>/chats` into
`~/Documents/Master's Wheel/<space>/` crosses two different Tauri
`BaseDirectory` roots the webview's fs capability isn't scoped to widen
just for this. Rather than broadening that capability for a one-off move,
`src-tauri/src/spaces.rs::migrate_legacy_data_to_default_space` does it
directly with `std::fs` (Rust bypasses the capability system entirely —
capabilities only gate the webview's plugin-fs calls). Ongoing registry
CRUD (create/delete/switch) stays plain TS, matching every other storage
module in this app — only the migration itself is the exception, and only
for this one reason.

## `createdAt` is frontend-supplied, not Rust-computed
`migrate_legacy_data_to_default_space` takes `created_at: String` from the
caller instead of formatting a timestamp itself, so Rust doesn't need a
date/time crate (`chrono`/`time`) for the one ISO8601 string it would
otherwise have to hand-roll (civil-from-days calendar math is a classic
source of off-by-one bugs). `src/lib/spaces/registry.ts::ensureInitialized`
passes `new Date().toISOString()`; the Rust side ignores it entirely once
already migrated.

## Media server root is now mutable, not fixed at spawn
Before Spaces, `media_server::spawn` captured one `PathBuf` once at app
launch. Switching Spaces mid-session needs the server to start serving a
different root on the very next request — `MediaServerHandle` wraps the
root in an `Arc<Mutex<PathBuf>>`; `switch_space_media_root` (a Tauri
command) is how the frontend tells it to update, called from
`SpacesProvider` every time the active Space changes. `lib.rs`'s initial
guess ("Default") is corrected within the same tick by the frontend's own
init effect — never a real race in practice, since nothing can request a
video before the webview has mounted.

## MCP subprocess gets its Space via an env var, not a shared module
`mcp/paths.rs::records_root()` runs inside a re-exec'd subprocess with no
`AppHandle` at all (see that file's own doc comment) — the only channel in
is what `mcp/config.rs::write_config_file` sets in the subprocess's env
(`MASTERS_WHEEL_RECORDS_ROOT`), computed by `assistant.rs` (which *does*
have an `AppHandle`) right before spawning. The env var carries the
already-resolved absolute path, not just a Space id/folder name — the
subprocess has no way to resolve `document_dir()` itself to turn an id
back into a path.

## Active Space is a module-level store, not threaded through every call
site
`src/lib/spaces/activeSpaceStore.ts` mirrors the existing
`src/lib/mcp/activeRecord.ts` pattern (a `useSyncExternalStore`-backed tiny
store) rather than passing `spaceFolder` as an argument through every
`listAgents()`/`saveSession()`/etc. call site across the app. `agents/
storage.ts`, `chat/storage.ts`, and `records/index.ts` all read
`getActiveSpaceFolder()` internally when building a path — zero changes
needed at any of their many call sites. The 2-3 Rust command wrappers
(`askAgent.ts`, `knowledgeFiles.ts`) read the same store and attach
`spaceFolder` to the `invoke()` payload themselves, since a Tauri command
boundary can't share JS module state the way everything else does.

## AIAssistant resets on Space switch during render, not inside an effect
It's a global singleton (mounted once in `layout.tsx`, outlives route
changes) holding in-memory agents/sessions/records state that has to drop
entirely on a Space switch. The first version did this in a `useEffect`
with synchronous `setState` calls — flagged by
`react-hooks/set-state-in-effect` as a cascading-render risk. Switched to
React's documented "adjust state when a prop changes" pattern instead:
compare the incoming Space id against a ref during render and reset
inline if it changed, no effect involved.

## Test investment: Rust file-move helpers only, no new TS test framework
This repo has zero TS test infrastructure (no vitest/jest) and an existing
`cargo test` setup already used by `mcp/bridge.rs`/`knowledge/prompt.rs`.
Added `#[cfg(test)]` coverage in `spaces.rs` for `rename_or_copy`/
`copy_dir_recursive` specifically — the actual risky part of this feature,
where a real bug could lose a user's Agents/chats/records. Didn't stand up
a new TS test runner just for this phase's simpler, lower-risk pure
functions (folder-name sanitization, the "can't delete the last Space"
guard) — proportional investment, not parity for its own sake.

## Capabilities consolidated into one `space-data`
`agents.json` and `chat.json` (scoped to `$APPDATA/agents` / `$APPDATA/
chats`) are gone — once Agents/chats live under `~/Documents/Master's
Wheel/` like everything else, the existing `records.json` capability's
`$DOCUMENT/Master's Wheel/**` scope already covers them with every
permission identifier they need. Renamed `records.json` →
`space-data.json` to reflect that it's no longer records-only.

## Icon set
Curated from `@phosphor-icons/react` (MIT), "duotone" weight, rendered via
`currentColor` so every Space's icon stays one uniform white (the glyph
identifies the Space, not a color) — deliberately not a new
category-palette variable, since all Spaces share the same rendering color
rather than each needing a distinct hue the way status/bookmark colors do.
