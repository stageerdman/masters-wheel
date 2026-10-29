# Wiki — Native macOS app shell

## Decisions
- Tauri over Electron: smaller bundle (~10-20MB vs ~150MB+), lower memory,
  Rust toolchain already on this machine. Keeps Next.js/React as the UI
  layer unchanged — only the shell around it changes.
- Next.js moves to `output: "export"` (fully static). This is a real
  pivot away from "deploy to Vercel later" as a hosted website — the app
  is now a bundled native binary. Vercel hosting isn't ruled out forever,
  just not the current direction.
- The dev loop (`tauri dev`) is configured to point at the user's
  already-running `npm run dev` server on :3000 rather than spawning its
  own — this project's standing rule is to never kill/restart that
  process, since the user watches it live in a real browser tab.

## Open questions for the next update (backend)
- Where does backend logic live once it starts getting added: Rust-side
  Tauri commands, or calls out to an externally hosted API? Deliberately
  not decided yet — revisit when backend work is actually dictated.
