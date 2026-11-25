# 04 · Cleanup review — Performance Review (Eraser)

Phase 4 of `00-roadmap.md`. I checked Jony's build (`7ea832f`, `8876033`) against `01-research.md`, `02-magic.md` and `03-ui-spec.md`.
Goal on this screen: **find a call, watch it, write what I learned.**

## Step counts (main flows)

| Flow | Before | After | Notes |
|---|---|---|---|
| Open the newest call and press play | 1 (play) | 1 | Still opens on the newest call. Nothing to cut. |
| See a call's date, outcome and amount | 2 (click "•••", read the panel) | 1 (read the facts line) | Cut: the toggle hid what people scan for. |
| Edit the amount or description | 3 (click "•••", find the field, type) | 3 (click the facts line, find the field, type) | Same count. The way in is now labelled by its content. |
| Find a call by what it was about | Not possible (search ignored the description) | 2 (type, click) | Search now matches the description too. |
| Check that a call's video is safe | No per-call answer (the summary line only gave counts) | 1 (look at the row; hover for words) | A receipt, not a status light. |
| Set Closed and see the closed date | 3 (set state, click "•••", read a field) | 2 (set state, click the facts line) | The Closed date field shows only when it applies. |

## Checklist

| Check | Result |
|---|---|
| Outcome glyph is label size, normal weight | Pass |
| Title first, human date second (micro, muted) | Pass |
| 3 px `--color-reviewed` bar removed from rows | Pass (the token stays in `globals.css` for AppHeader and the Training Room, outside this screen) |
| Loudness: title › glyph › reviewed dot (0.7) › backed-up ✓ (micro, 0.45) | Pass |
| `backed_up` shows ✓ with "Video backed up to OneDrive" | Pass (tested in `backupMark.test.mjs`) |
| `pending` shows nothing; screen readers hear "Not backed up yet" | Pass (tested) |
| `not_connected` renders no element | Pass (tested) |
| `checking` never counts as backed up | Pass (tested; mapped to `pending`) |
| Mark is never a button, never red, no cloud, no spinner, no toast, no sound | Pass |
| `toBackupState()` is the only reader of per-video storage status in Performance Review | Pass. It lives in `PerformanceReview.backup.ts` (no React or path aliases, so `npm test` can import it) and is re-exported by `PerformanceReview.data.ts`. Nothing else in the element reads `VideoState`. `StorageStatusLine` reads the same overview only for the summary line, through `statusLine()` in `src/lib/onedrive/panelText.ts`. It doesn't read per-session status, so it stays the one place for problems and fixes. |
| "•••" toggle gone; facts line opens the same panel | Pass |
| Disabled Closed date gone (shown only when Closed) | Pass |
| `0/200` counter only from 180 characters | Pass |
| Panel and notes boxes gone; focus uses a box-shadow ring, never `outline` | Pass |
| Page turn: 140 ms, 0.6 → 1, on the title, notes and detail panes, not the video | Pass |
| All motion sits behind `prefers-reduced-motion: no-preference` | Pass |
| No motion on first load | **Failed, fixed by me** (see below) |
| CSS uses variables only; styles and position kept in separate modules | Pass |

## What I fixed (a removal-only fix)

**Every backed-up mark faded in when the screen opened.** The storage overview loads after the first paint, so each row went `not_connected → backed_up` a moment after opening. The old hook animated any change to "visible", so with 40 rows you got 40 marks fading in at once. That is the "lie" `02-magic.md` warns about: nothing had just happened.
Fix in `VideoListItem.tsx`: `useArrivedLive(value, on, from)` now lets the backed-up mark settle only on a live `pending → backed_up` change. The reviewed dot still settles on any live tick. No new UI.

## Still open (not blocking this sign-off)

- **Two ways to generate a scorecard (research Q4).** The header island's "Generate scorecard" button repeats the one in the Scorecard view, which breaks "one place per action". The fields are required in `src/elements/AppHeader/AppHeader.context.tsx`, outside this element's folder and outside my removal-only brief. Recommendation for Columbo: make them optional in `HeaderIsland`, stop passing them from `PerformanceReview.tsx`, and drop the button from `ActionIsland`. That cuts one control and one confirm dialog from the header. It needs the captain's OK.
- **Two subscriptions to the storage overview** (`PerformanceReview.script.ts` and `StorageStatusLine`). Users can't see this: it means two reads per `storage://changed`. Worth sharing one later. It isn't clutter.
- **Watch later:** if the list ever gets a third mark per row, re-check the loudness order. The backed-up ✓ must stay the faintest thing in the row.

## Verdict

**APPROVED.** The flow is lean. The main flows lost a step or kept their count, and none gained one. The one magic defect (marks animating on open) is fixed.
Checks: `npx tsc --noEmit` is clean (after `npx next typegen`; the `LayoutProps` error was only missing generated types), `npm run lint` is clean, and `npm test` passes 47 of 47.
Nobody clicked through the screen live. The checks are the code review, the tests and the build.

Signed: Eraser (Step Eraser), 2026-11-25
