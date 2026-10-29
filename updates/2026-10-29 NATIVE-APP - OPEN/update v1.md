# Update v1 — Native macOS app shell

## Goal
Stop treating this as a website. Package the existing Next.js UI as a real,
launchable `.app` on macOS using Tauri, so it opens like a native
application instead of living in a browser tab. This update only covers the
packaging shell — no backend logic yet (that's explicitly next, in its own
update once it's dictated).

## Why Tauri
Chosen over Electron: much smaller bundle, lower memory, keeps the existing
Next.js/React UI untouched as the frontend. Rust toolchain already present
on this machine (`cargo`/`rustc` confirmed installed).

## Spec, as dictated
- No more "website" framing — this is a real app going forward.
- Turn off construction outlines (`--construction-outlines: 0` in
  `globals.css`) — done as part of this update, first commit.
- Produce an actual `.app` bundle that launches on this MacBook.

## Roadmap

### Phase 1 — Static export groundwork
- [x] `next.config.ts`: add `output: "export"` so the UI can be bundled as
      static files Tauri can load with no Node server at runtime.
- [x] `images: { unoptimized: true }` (static export can't run the Next.js
      Image Optimization API; `AppHeader` uses `next/image`).
- [x] Check `cacheComponents` / `partialPrefetching` compatibility with
      static export — both are dynamic-rendering features that may not
      apply to a fully static build. Resolve whatever `npm run build`
      surfaces; document the call in Decisions below.
- [x] `npm run build` succeeds and produces `out/` with all routes
      (`/`, `/performance-review`, `/agents`) as static HTML.

### Phase 2 — Tauri shell
- [x] Add `@tauri-apps/cli` (dev dependency) and `@tauri-apps/api`.
- [x] Scaffold `src-tauri/` (Cargo.toml, tauri.conf.json, build.rs,
      src/main.rs, icons) targeting macOS only for now. Scaffolded via
      `npx tauri init --ci` (non-interactive flag), then hand-edited
      `tauri.conf.json`.
- [x] `tauri.conf.json`: `frontendDist` → `../out`, `devUrl` →
      `http://localhost:3000` (the dev server the user already has running
      — config points at it, nothing in this setup starts/stops it),
      `beforeBuildCommand` → `npm run build`, `beforeDevCommand` left empty
      (so `tauri dev` never spawns its own Next.js server), product name
      "Master's Circle", bundle identifier `com.erdman.masterswheel`,
      `bundle.targets` narrowed to `["app"]` since only a macOS `.app` is
      in scope right now.
- [x] `package.json` scripts: `app:dev` (`tauri dev`), `app:build`
      (`tauri build`).
- [x] `.gitignore`: add `src-tauri/target/` (`/out/` was already present).

### Phase 3 — Verify
- [x] `npm run app:build` produces a real `.app` bundle — launch it and
      confirm the UI renders. Done: `cargo build` compiled cleanly (~54s
      cold, crates fetched fresh) and bundled `Master's Circle.app`
      (11.98 MiB). This machine has a global `~/.cargo/config.toml`
      (`[build] target-dir = "/Users/stage/.cargo-shared-target"`,
      predates this update) that redirects *all* Cargo output, including
      Tauri's, to a shared dir instead of the per-project
      `src-tauri/target/`. So the real build output here is at
      `/Users/stage/.cargo-shared-target/release/bundle/macos/Master's
      Circle.app`, not `src-tauri/target/release/bundle/macos/` — same
      build, different path, documented in Decisions below. Launched via
      `open`, confirmed the process (`Contents/MacOS/app`, a Mach-O arm64
      binary) ran for several seconds with active CPU usage and no crash,
      then quit it.
- [x] `npm run app:dev` opens a native window against the already-running
      dev server — config verified by reading `tauri.conf.json` back
      (`devUrl: http://localhost:3000`, `beforeDevCommand: ""` so nothing
      spawns/kills the user's running `next dev`). Not run interactively:
      doing so would require visually confirming a window renders
      correctly, which isn't possible headlessly here — consistent with
      this project's standing pattern of flagging unverified live-UI
      checks for the user's own eyes. **Needs the user to run
      `npm run app:dev` themselves and confirm the window renders the
      live dev server.**
- [x] Update `FEATURES.md` / `README.md` to reflect native packaging.

## Decisions
- Removed `cacheComponents: true` and `partialPrefetching: true` from
  `next.config.ts`. Confirmed by running `npm run build` with both still
  set alongside `output: "export"`: Next.js threw `Error: Invariant: PPR
  cannot be enabled in export mode` during the build (pages compiled and
  prerendered fine, then the build step itself failed on that invariant).
  PPR/cache-components are dynamic-rendering features with no meaning once
  everything is pre-rendered to static HTML ahead of time, so dropping them
  is correct, not a workaround. Removing both made `npm run build` succeed
  cleanly, producing `out/index.html`, `out/performance-review.html`, and
  `out/agents.html`.
- The actual `.app` bundle on this machine lands in
  `/Users/stage/.cargo-shared-target/release/bundle/macos/`, not
  `src-tauri/target/release/bundle/macos/` as a default Tauri setup would
  place it. This machine has a pre-existing global
  `~/.cargo/config.toml` that redirects all Cargo build output to a
  shared target dir across projects (to compile common crates like
  `tauri`/`serde`/`tokio` once instead of per-project) — this predates
  this update and is a machine-level choice, not something this update
  changed. Nothing in `src-tauri/` needed to change for this; it's purely
  informational for anyone looking for the built app later.

## Next
Backend work starts in its own update once dictated. At that point decide
how backend logic reaches this app (Rust-side Tauri commands vs. calling an
externally hosted API) — not decided yet, deliberately deferred.
