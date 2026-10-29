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
- [ ] `npm run app:build` produces a real `.app` in
      `src-tauri/target/release/bundle/macos/` — launch it and confirm the
      UI renders.
- [ ] `npm run app:dev` opens a native window against the already-running
      dev server (confirms the dev loop works without ever touching that
      process).
- [ ] Update `FEATURES.md` / `README.md` to reflect native packaging.

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

## Next
Backend work starts in its own update once dictated. At that point decide
how backend logic reaches this app (Rust-side Tauri commands vs. calling an
externally hosted API) — not decided yet, deliberately deferred.
