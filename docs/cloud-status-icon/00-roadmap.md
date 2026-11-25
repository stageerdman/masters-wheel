# Cloud status icon — roadmap

Goal: replace the upload banner (`StorageStatusLine`) in Performance Review with a small cloud icon at the top right. Clicking it opens a popover that shows progress.
Team: Magic UX (captain Columbo). Order and rules: `principles/magic-ux/how-we-work.md`.

Tick a box only when its check has really passed.

1. **Research (Columbo)** · `01-research.md`
   - [x] How people check uploads, scored and deep-dived: the quick glance, a long upload ("can I close the lid?"), an error and Retry, offline or signed out, and the per-session backed-up check.
   - [x] How Dropbox, iCloud and Google Drive show sync status.
   - [x] What speed or ETA users really need. Today's data has neither.
   - **Check:** the file is committed. Each moment names the real fields in `src/lib/onedrive/storage.ts` it depends on.

2. **Magic (Merlin)** · `02-magic.md`
   - [x] At most 2 to 3 quiet touches, each with a name, its timing in ms, when it fires, and a reduced-motion version.
   - **Check:** the file is committed. Nothing moves while idle. Errors stay calm. Jony can build from it without asking.

3. **Build (Jony)** · `03-ui-spec.md` + `src/elements/PerformanceReview/children/CloudStatus/`
   - [x] A short UI spec.
   - [x] The cloud icon at the top right of Performance Review, with its states worked out in `cloudState()` in `CloudStatus.script.ts`.
   - [x] The popover with live data from `useStorageOverview()`: videos left, GB left, speed/ETA (worked out on the client), errors with Retry, and one Settings link.
   - [x] `<StorageStatusLine/>` removed and its folder deleted.
   - **Check:** `npx tsc --noEmit`, `npm run lint` and `npm test` pass.

4. **Cleanup review, rebuild, Start (Eraser)** · `04-cleanup-review.md`
   - [ ] No leftover banner code, text, imports or css. The cloud icon is the only place to see upload status in Performance Review.
   - [ ] The popover holds only the essentials. Magic stays quiet and respects reduced motion. The per-session backed-up checks are still there.
   - [ ] `npm run app:start` rebuilds and opens the app. The window that opens shows the cloud icon, and the popover opens on click.
   - **Check:** the review is written and signed off, and every phase above is ticked.

## Done for the whole item
The old banner is gone. The cloud icon and popover work with live data. Start opens the version that shows them.

## Out of scope
- Changes to the storage engine (Rust) or to `StorageOverview`. The client works out speed and ETA itself.
- Settings › Storage, the Training Room, and any notifications, Dock badge or sound.
