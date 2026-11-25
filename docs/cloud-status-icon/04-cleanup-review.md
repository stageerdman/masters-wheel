# 04 · Cleanup review: cloud status icon (Eraser)

Phase 4 of `00-roadmap.md`. I checked Jony's build (`ac74e9f`) against `01-research.md`, `02-magic.md` and `03-ui-spec.md`.
Goal: **"Is my call recording safe, and can I stop thinking about it?"**

## Step counts

| Flow | Before (banner) | After (icon) | Notes |
|---|---|---|---|
| Glance: are my videos safe? | 1 (find and read a full-width line under the list) | 1 (look at the icon) | Same count, but nothing to read. The plain cloud means safe. |
| "Can I close the lid?" while uploading | 1 (read the line; it never answered the question) | 2 (click, read) | One extra step, and it's the only way to get the answer at all. Kept. |
| Fix an unreadable file | 2 (click the line → Settings, click Retry) | 2 (click the icon, click Retry) | Same count, but you don't leave the screen. |
| Fix sign-in or a full OneDrive | 2 (click the line → Settings, act) | 3 (click the icon, click the link, act) | +1. Kept because the reason is real: the dot only says "needs you", and the popover's first line says what is wrong before you go. The link wording names the fix ("Sign in to OneDrive", "Manage storage"). |
| Is this one call backed up? | 1 (look at the row's ✓) | 1 | Unchanged. |

## Checklist

| Check | Result |
|---|---|
| `StorageStatusLine` folder deleted, import and `<StorageStatusLine/>` gone from `Navigation.tsx` | Pass. No match for `StorageStatusLine` in `src/`, and none in the built `out/`. |
| No leftover banner css | Pass. Its two css modules went with the folder. `Navigation` css has no banner rules. |
| One place to see upload status in Performance Review | Pass. `CloudStatus` is the only caller of `statusLine()` / `problemNotice()` on this screen. The row ✓ answers a different question (this call, not uploads), as the research asked. |
| Popover holds only: problem with Retry, lid answer or idle line, videos and GB left, time left, passing errors, one Settings link | Pass after my fixes (below). No speed number, no second link, no spinner. |
| Nothing moves while idle; nothing animates on first render | Pass. `useRingMotion` starts with `snap = true` and only adds `settleIn`/`landing` on live changes. |
| Reduced motion | Pass. Every transition and animation sits in `prefers-reduced-motion: no-preference`. Under `reduce` only the 400 ms hold stays, and it changes nothing you can see. It's there so the ring is removed on `animationend`. |
| Per-session backed-up checks | Pass. `toBackupState` / `backupStateFor` / `backupMark` are untouched, and `VideoListItem` still draws the ✓. Their tests pass. |
| `npm run lint`, `npm test` | Pass, and the tests pass 61 of 61. `npx tsc --noEmit` passes once Next has generated its types (the `next build` inside Start does this). Before that it only reports the known missing `LayoutProps`. |

## What I fixed (removal-only, inside `CloudStatus/`)

In some states the popover said the same thing twice, or contradicted itself:

1. **Idle + offline: one sentence twice.** In that state `statusLine()` returns the offline sentence, so the idle line and the offline line both printed "Offline · …". Now the offline line only shows when the state isn't idle, and only when `statusLine()` really returned the offline sentence.
2. **A problem while offline: the problem twice.** `statusLine()` puts signed out, revoked and full ahead of offline, so the "offline" line repeated the notice ("Signed out of OneDrive · uploads paused" under "Signed out of OneDrive."). This is fixed by the same check as in 1.
3. **Idle while waiting for Keychain: two sign-in messages.** "Waiting for Keychain access…" and "Checking your OneDrive sign-in · uploads start after" both showed. The idle line now gives way to the notice.
4. **Stuck videos said "retrying in a moment".** The engine sets `lastError` from its retry table for any video, so an unreadable file could show "Retry" and "retrying in a moment" at once. That contradicts itself. Now only videos still on their way list a passing error (`isMoving()`, now exported from `CloudStatus.script.ts`).

No new UI, words or motion.

## Start

`npm run app:start` built the app (Next + Tauri release). It quit the running app, installed the new build to `/Applications/Master's Wheel.app` and opened it.
The built frontend (`out/_next/static/chunks/…`) contains the popover's "OneDrive uploads" dialog and the lid sentence, and has no banner code. So the installed app is the new version.
**I couldn't look at the window myself.** I have no tool for screenshots or for clicking in the app. So I haven't seen the icon in the header with my own eyes, and I haven't clicked it to see the popover open. Someone with screen access needs to do this 10-second check. Until then, the last box in phase 4 stays open.

## Watch later

- `AppHeader`'s `accessory` slot is now a general hook. If a second page puts something there, re-check "one place per action".
- The ring is muted for any passing `lastError`. If the engine starts keeping old errors on videos that are moving fine, the ring will look paused when it isn't.
- Two subscriptions to the storage overview remain (`PerformanceReview.script.ts` and `CloudStatus`). Users can't see it. It isn't clutter.

## Verdict

**APPROVED: the flow and the code.** The banner is fully gone, the icon is the one place for upload status, the popover is down to the essentials, and the magic is quiet and respects reduced motion.
The window check is **not signed off** yet: the build is installed and opened, but nobody has seen the icon or clicked it. When someone has, tick the last box in `00-roadmap.md` phase 4.

Signed: Eraser (Step Eraser), 2026-11-25
