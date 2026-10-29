# Wiki — Native macOS app shell

## Decisions
- Tauri over Electron: smaller bundle (~10-20MB vs ~150MB+), lower memory,
  Rust toolchain already on this machine. Keeps Next.js/React as the UI
  layer unchanged — only the shell around it changes.
- Next.js moves to `output: "export"` (fully static). This is a real
  pivot away from "deploy to Vercel later" as a hosted website — the app
  is now a bundled native binary. Vercel hosting isn't ruled out forever,
  just not the current direction.
- Dropped `cacheComponents: true` and `partialPrefetching: true` from
  `next.config.ts`. Tested directly: with `output: "export"` and both
  flags still on, `npm run build` fails with `Error: Invariant: PPR
  cannot be enabled in export mode` — pages still prerender, but the
  build step throws after. PPR and Cache Components exist to manage a
  dynamic/streaming render; a static export has already fully
  prerendered every route ahead of time, so there's nothing left for
  them to do. Removing both, build succeeds and produces `out/` with all
  3 routes as plain static HTML.
- The dev loop (`tauri dev`) is configured to point at the user's
  already-running `npm run dev` server on :3000 rather than spawning its
  own — this project's standing rule is to never kill/restart that
  process, since the user watches it live in a real browser tab.

- On this machine, `npm run app:build`'s actual `.app` output lands under
  `/Users/stage/.cargo-shared-target/release/bundle/macos/` rather than
  `src-tauri/target/release/bundle/macos/`, because of a pre-existing
  global `~/.cargo/config.toml` that shares one Cargo target dir across
  all Rust/Tauri projects on this machine. Not a Tauri config problem —
  just where to look for the bundle here.

## Open questions for the next update (backend)
- Where does backend logic live once it starts getting added: Rust-side
  Tauri commands, or calls out to an externally hosted API? Deliberately
  not decided yet — revisit when backend work is actually dictated.
