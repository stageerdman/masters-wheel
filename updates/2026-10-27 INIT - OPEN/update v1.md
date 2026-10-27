# INIT — Adopt masters-wheel into AI Control

**Date:** 2026-10-27
**Status:** OPEN

## Goal
Stand up the prototype for "Master's Circle": a mastery platform for
uploading lessons/videos, analyzing performance, and always refocusing on the
right lesson. This INIT builds no real features — just the AI Control
scaffold, the chosen stack, and the element architecture everything else will
be built on.

## Context
Greenfield project. The user will dictate UI elements one at a time; the job
here is to make sure that process stays extremely lean and modular: every
element is its own folder with its own component, styling, and positioning
files (plus an optional script file), and can have non-reusable children
nested inside it. Reusable elements (e.g. standardized side-menu buttons) get
defined once and imported everywhere they're used.

## Roadmap

### Phase 0 — AI Control scaffold (this update)
- [x] Add `.project` marker (modules: STRUCTURE, CODING, WORKFLOW, UX;
      secrets: none yet).
- [x] Generate `CLAUDE.md` from the four global modules, tuned for
      Next.js/TypeScript and the element convention.
- [x] Create `updates/`, `issues.txt`, `.env` (empty — no secrets yet).
- [x] Confirm `.gitignore` covers `.env` (Next.js default already does, via
      `.env*`).

### Phase 1 — Design the element principles
- [x] Define the element folder convention: `Name.tsx` (component),
      `Name.styles.module.css` (look), `Name.position.module.css` (where it
      sits in its parent), optional `Name.script.ts`, optional `children/`
      for non-reusable sub-elements.
- [x] Decide reusable elements live flat under `src/elements/` and get
      imported, never duplicated; standard shape is enforced via typed props.
- [x] Record the convention in `CLAUDE.md` (project-specific notes) and in
      this update's `wiki.md`.

### Phase 2 — Select stack, scaffold the app shell
- [x] Stack: Next.js 16 (App Router) + TypeScript + CSS Modules. No
      Tailwind/shadcn — the custom element convention replaces a component
      library. No backend/DB/auth yet.
- [x] Scaffold via `create-next-app`; strip default boilerplate (marketing
      page, default SVGs, `AGENTS.md`) since this project uses `CLAUDE.md`.
      Set `agentRules: false` in `next.config.ts` so Next.js stops
      regenerating `AGENTS.md`.
- [x] Build `src/elements/Canvas/` as the root element (rendered by
      `src/app/page.tsx`) — almost no styling, just proves the convention
      end-to-end and gives the user a blank canvas to start dictating into.
- [x] Verify: `npm run build` succeeds; `npm run dev` serves `/` with a 200
      and no console errors.

### Phase 3 — GitHub + first commit (this update)
- [x] Create private GitHub repo `stageerdman/masters-wheel`.
- [x] Connect the local repo as `origin`.
- [x] First commit: the full scaffold above.
- [x] Push (`main` tracking `origin/main`).

## Decisions
- Kept all four modules (STRUCTURE, CODING, WORKFLOW, UX) — this is a real
  user-facing app from day one.
- Chose Next.js/TypeScript over a native/Tauri app: this is a browser-based
  platform (uploads, video, dashboards), not a local desktop utility, and the
  session's tooling is Vercel-oriented.
- Deliberately skipped Tailwind/shadcn (UX.md's default suggestion) because
  the user explicitly wants per-element styling/positioning files instead of
  a utility-class or component-library approach. See `wiki.md`.
- No Vercel project link yet (Vercel CLI isn't installed locally and nothing
  needs deploying yet) — left for a later phase when there's something worth
  deploying.
- `secrets: []` in `.project` / empty `.env` — no backend, auth, storage, or
  AI integration exists yet, so there's nothing to hold secrets for.

## Next
- Start dictating real elements (first lesson/video/performance UI) directly
  under `src/elements/`, following the convention.
- When a backend, auth, storage, or AI feature is actually needed, open a new
  update, add the secret to `.env` + `.project`, and pick the Vercel
  integration then (not before).
