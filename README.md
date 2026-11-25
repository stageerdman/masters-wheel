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
npm run app:open    # opens this checkout's build
npm run app:install # copies it to /Applications/Master's Wheel.app
npm run app:start   # build + install + open (the studio's Start button)
npm run app:dev     # native window against the dev server above
```

`app:build` always puts the `.app` in this checkout's
`src-tauri/target/release/bundle/macos/`: it overrides the machine-wide
shared Cargo target dir, which every worktree writes to, so the app opened
from there could be any branch's build (that is why OneDrive storage was
missing from the launched app). `app:dev` expects
`npm run dev` already running on :3000 — it never starts or stops that
server itself.
