# Master's Wheel (masters-wheel)

Prototype of a mastery platform: upload lessons/videos, analyze performance,
and always get pointed back to the right lesson to refocus on. Packaged as a
native macOS app (via Tauri), not a hosted website.

Right now this is a UI shell only — no real features yet. See `CLAUDE.md` for
the stack, the element convention, and how this project is run day to day.

## Run it (web dev loop)

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Run it (native app)

```bash
npm install
npm run app:build   # builds the Next.js static export, then the .app
npm run app:dev      # native window against the dev server above
```

`app:build` produces a `.app` bundle under
`src-tauri/target/release/bundle/macos/` (or wherever `CARGO_TARGET_DIR`/a
shared Cargo target dir is configured on the machine). `app:dev` expects
`npm run dev` already running on :3000 — it never starts or stops that
server itself.
