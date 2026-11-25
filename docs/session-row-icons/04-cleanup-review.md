# Session row icons: cleanup review

Reviewer: Eraser (Magic UX) · 2026-11-25
Reviewed: `0a3d742` (code), `0e6633d` (`03-ui-spec.md`).

## Goal
Look down the list and know, without clicking, which calls are still to review and where each video lives.

## Step count (the daily scan)
1. Look at the row's right edge: is there a Reviewed check? (no click)
2. Look one slot to the left: which storage shape? (no click)
3. Optional: hover a mark to read its words.

That's 2 glances and 0 clicks, with 1 optional hover. Before this change it was also 2 glances, but both glyphs were misread (`•` looked like "unread", `✓` looked like "reviewed"), which cost an extra click into the session to be sure. Target: 2. **Met.**

## Checks

| Check | Result |
|---|---|
| At most two marks per row | Pass. There are two fixed 14 px slots (storage, Reviewed). Nothing else was added. |
| No state shown twice | Pass, with one fix needed (F2). The row shows this video only. Percent, reasons, Retry and sign-in stay in the header popover. The stuck tooltip points to the popover; it doesn't repeat it. |
| Every icon has a tooltip and aria-label in words | Pass. Each slot span has `role="img"`, a `title` and an `aria-label` with the same words. The SVG is `aria-hidden`. |
| Leftovers: `•` / `✓` on the row | Pass. Neither is in `VideoListItem/`. (The `✓` in `ActionIsland` is the header toggle and is out of scope.) |
| Leftovers: old `BackupState` values | Pass. A grep finds no `backed_up`, `pending` or `not_connected` in `src/elements/PerformanceReview`. |
| Leftovers: unused CSS | Pass. `.reviewedMark`, `.backupMark`, `.srOnly` and `--mark-rest` are gone, and every class left is used. |
| Leftovers: dead labels | Pass. "Not backed up yet" is gone from the code and the built bundle. |
| Leftovers: dead fields | **Fail (F1).** |

## Findings, for Jony

**F1 · Cut: `visible` on `BackupMark`.** It is always `true` now, and nothing reads it (grep: no `.visible` in `PerformanceReview`). It only existed for the screen-reader-only path, which you removed. Cut it from the `BackupMark` type and from `backupMark()`, drop `visible: true` from the five assertions in `backupMark.test.mjs`, and change the spec's build notes to `{ label, icon } | null`.

**F2 · Fix: the uploading label says "Uploading" when nothing is uploading.** `paused` and `waiting` map to `uploading`, and their tooltip says "Uploading to OneDrive…". The header popover already refuses to say that (`panelText` test: "paused uploads are not called uploading"), so the row and the popover contradict each other about the same video, and our rule says labels stay literal. Keep the one icon and the one state; only change the words to something true for waiting, uploading, checking and paused alike, e.g. "Not in OneDrive yet. On its way". The wording is your call. Don't add a sixth state or icon for paused.

**Open question 1: laptop on every row when not connected. Keep it.** It is true ("only on this Mac"), it is the reason to connect, and it costs no step. Drawing nothing would make "not connected" look the same as "not read yet" (unknown), which is hidden confusion.

**Open question 2: the label for paused.** Covered by F2.

## Integration (run on this branch)
- `npm run test:all`: pass (67 JS, 111 Rust). This checkout first needed `npm install`.
- `npm run lint`: clean.
- `npm run build`: pass. Note: on the first run in a fresh shell, Next 16.4.3 stops once with a security-advisory notice and passes on the retry. That's a Next.js matter for the orchestrator; it isn't caused by this item.
- `npm run app:build` + launch (`npm run app:start`): pass. The new build was installed to `/Applications` and is running. The built JS has the new labels ("Upload stuck. Open…", "Reviewed: you marked…") and no "Not backed up yet".
- **Nobody has looked at the window yet.** I can't take screenshots here, so "the open window shows the new icons" and "told apart at a glance, also in greyscale" are still open. From the code, the shapes are distinct: cloud, cloud + laptop, laptop, cloud + arrow, cloud + `!`, circle + check. A test asserts that every state has its own icon.

## Verdict: RETURNED (small)
The flow is lean: 2 glances, 0 clicks. There's one dead field to cut (F1) and one label that isn't true (F2). Reworking them is Jony's job. When both are in, I check them and sign. A person still has to look at the window for the last two roadmap boxes.

Signed: not yet.
