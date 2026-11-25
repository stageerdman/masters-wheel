# Performance Review redesign — roadmap

Goal: a calm, clean Performance Review screen, and a tiny quiet "backed up" mark on each session row.
Team: Magic UX (captain Columbo). Order and rules: `principles/magic-ux/how-we-work.md`.

Each phase ends with a check. Tick a box only when its check has really passed.

## Phase 1 — Research (Columbo) · `01-research.md`
- [x] How people use this screen, scored and deep-dived.
- [x] The clutter that gets in the way of each top behavior.
- [x] What "backed up" means to the user.
- [x] The backup-status contract (`BackupState`, `toBackupState(raw)`).
- **Check:** the file is committed. Every top behavior names its clutter. The contract names the real source fields that exist in the code today (`src/lib/onedrive/storage.ts`).

## Phase 2 — Magic moments (Merlin) · `02-magic.md`
- [x] At most 3 quiet moments, each with timing, easing and a reduced-motion fallback.
- **Check:** the file is committed. Nothing loud (no badges, colour bursts or toasts). Nothing shows for `not_connected`. Every moment also works with reduced motion.

## Phase 3 — UI redesign plus the backed-up mark (Jony) · `03-ui-spec.md` + `src/elements/PerformanceReview/**`
- [x] A short UI spec: hierarchy, spacing, one type scale (the 4 existing sizes), few colours (the core 5).
- [x] Rebuild the screen. Remove what the research names as clutter. (The header's duplicate "Generate scorecard" is still there: Q4, the captain's call. See `04-cleanup-review.md`.)
- [x] `BackupState` type, plus a `backup` field on each session item, filled only by `toBackupState(raw)` in `PerformanceReview.data.ts`.
- [x] The mark in `VideoListItem`, with the labels "Backed up to OneDrive" / "Not backed up yet". (Shipped as "Video backed up to OneDrive", per Q1.)
- **Check:** `npx tsc --noEmit`, `npm run lint` and `npm test` pass. A new test shows the mark for `backed_up` and not for `pending` or `not_connected`. Note: `npm test` only runs `src/lib/**/*.test.mjs`, so the test has to live where that glob finds it, or the glob is widened on purpose.

## Phase 4 — Cleanup review (Eraser) · `04-cleanup-review.md`
- [x] Check the build against `01-research.md` and `03-ui-spec.md`. Look for a second way to do the same thing, leftover labels or panels, loud styling, and magic that confuses.
- [x] Confirm that `toBackupState()` is the only reader of the storage status inside Performance Review.
- [x] Removal-only fixes, or send the work back to Jony. (One fix: marks no longer fade in on open.)
- **Check:** the review is signed off. Tests, type-check and lint all pass.

## Phase 5 — Rebuild and push (Eraser)
- [x] `npm run app:build`, so the project's Start button opens the new app. (Built with `npm run app:start`. Installed to /Applications and launched. Nobody has clicked through the screen live yet.)
- [x] Tick every phase above. `git pull --rebase`, then push the branch.
- **Check:** the build succeeds, the newest `.app` launches, and the branch is on `origin`. Say plainly that nobody clicked through the screen live, if that is true.

## Out of scope
- How OneDrive uploads work (that is Uncle Bob's part of the goal). We only read the status he exposes.
- Backing up notes, transcripts or scores. Only videos are stored in OneDrive (`docs/onedrive-storage/SPEC.md` §1).
- The Training Room, Settings › Storage, and the header's state/reviewed controls, apart from removing duplicates the research names.
