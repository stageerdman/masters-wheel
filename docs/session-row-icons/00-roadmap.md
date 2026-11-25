# Session row icons: roadmap

Goal: each Performance Review session row shows clearly where its video lives (cloud only, cloud + this Mac, this Mac only, uploading, stuck) and whether you reviewed it, using one icon set with a plain tooltip on every icon.
Team: Magic UX (captain Columbo). Order and rules: `principles/magic-ux/how-we-work.md`. Why: `01-research.md`.

Tick a box only when its check has really passed.

## The contract (Jony builds exactly this)

### Storage state: `PerformanceReview.backup.ts`

```ts
export type BackupState =
  | "unknown"          // overview not read yet: draw nothing
  | "cloud_only"
  | "cloud_and_local"
  | "local_only"
  | "uploading"
  | "stuck";
```

`"backed_up"`, `"pending"` and `"not_connected"` are removed. Not connected now maps to `local_only`.

`toBackupState({ connected, video })`:

| Input | Result |
|---|---|
| `connected` is false | `local_only` |
| connected, `video` undefined (no entry yet) | `local_only` |
| `video.state === "inCloud"` | `cloud_only` |
| `video.state === "safeOnMac"` | `cloud_and_local` |
| `"notUploadedFull"`, `"notUploadedUnreadable"`, `"missing"` | `stuck` |
| `"waiting"`, `"uploading"`, `"checking"`, `"paused"`, and any other or new state | `uploading` |

`backupStateFor(overview, spaceId, recordId)`: `overview === null` → `unknown`; otherwise as above.

Rules:
- A non-null `lastError` on a moving video does **not** make it `stuck`. The engine retries by itself, and the popover shows "retrying".
- The stuck list must be the same as `STUCK` in `CloudStatus/CloudStatus.script.ts` (`notUploadedUnreadable`, `notUploadedFull`, `missing`). Write the list again in `backup.ts` with a comment pointing to it. Don't import across elements. Don't edit `CloudStatus`.
- `checking` is never safe. Only `safeOnMac` and `inCloud` draw a cloud without an arrow or alert.

`backupMark(state)` returns `{ label: string; icon: StorageIcon } | null`, with `StorageIcon = "cloud" | "cloudDevice" | "device" | "cloudUp" | "cloudAlert"`:

| State | Icon (shape) | Label (tooltip + aria-label) |
|---|---|---|
| `unknown` | none, returns `null` | (none) |
| `cloud_only` | `cloud`: cloud alone | `In OneDrive only. Plays from the cloud` |
| `cloud_and_local` | `cloudDevice`: cloud plus small laptop | `On OneDrive and this Mac` |
| `local_only` | `device`: laptop alone | `Only on this Mac. Not uploaded yet` |
| `uploading` | `cloudUp`: cloud with up arrow | `Not in OneDrive yet. On its way` |
| `stuck` | `cloudAlert`: cloud with `!` | `Upload stuck. Open the cloud icon at the top to see why` |

The screen-reader-only text path goes away, since every state now has a real icon with an `aria-label`. The `uploading` label also covers waiting, checking and paused, so it never says "uploading" (the header popover doesn't either).

### Reviewed mark: `VideoListItem.tsx`
- Shown only when `video.reviewed` is true. Nothing is drawn when false: an empty slot means "still to do".
- Icon: a **check in a circle**, line style, in `--color-reviewed`. It matches the header toggle's check (`ActionIsland`). **Never a bare dot.**
- `title` and `aria-label`: `Reviewed: you marked this call as reviewed`. Don't say "watched": the app only knows you ticked it (see research).
- Storage icons never use a check, so the only check on a row means Reviewed.

### Icon set and row layout
- One set of inline SVG line icons, in one new component in the `VideoListItem/` folder (e.g. `RowIcon.tsx`). Same viewBox, stroke width, size (about 14 px) and round caps for all six (five storage icons + Reviewed). Colour comes from `currentColor`.
- Colours: storage icons use the muted text colour. `stuck` uses the existing warning or danger token. Reviewed uses `--color-reviewed`. **Shape alone must tell each state apart.** Check the row in greyscale.
- Order on the row stays calm: outcome glyph, title over date, then the marks. **At most two marks**, in fixed slots: storage, then Reviewed. Each slot keeps its width when empty, so the marks line up as columns down the list.
- No extra text on the row. No percent and no per-row Retry: the header popover holds those (one place per action).
- The uploading icon is static. Motion stays in the header ring.
- Keep the existing settle animation and its reduced-motion rule. Storage settles only when a row goes **live** from `uploading` to `cloud_and_local` or `cloud_only` (never from `unknown`, so rows don't all fade in when the app opens). Reviewed settles when it turns on live, as today.

## Phases

1. **Research (Columbo)** · `01-research.md`
   - [x] How people read per-file storage icons in OneDrive, iCloud Drive, Dropbox and Google Drive.
   - [x] What people think "Reviewed" means on a call recording, and why `•` and `✓` are misread today.
   - [x] Behavior table, deep dives and a watch-out list. Every raw `VideoState` is mapped to a row case.
   - **Check:** the file is committed. Each row case names the raw fields it depends on.

2. **Storage state and labels (Jony)** · `PerformanceReview.backup.ts`, `src/lib/performanceReview/backupMark.test.mjs`
   - [x] `BackupState` has the six values above. The old values are gone everywhere (`grep` finds no `backed_up`, `pending` or `not_connected` in `src/elements/PerformanceReview`).
   - [x] Cloud only: `inCloud` → `cloud_only`.
   - [x] Cloud + this Mac: `safeOnMac` → `cloud_and_local`.
   - [x] This Mac only: not connected, or no entry yet → `local_only`.
   - [x] Uploading: `waiting`, `uploading`, `checking`, `paused` and unknown states → `uploading`.
   - [x] Stuck/failed: `notUploadedFull`, `notUploadedUnreadable`, `missing` → `stuck`. A moving video with `lastError` stays `uploading`.
   - [x] `overview === null` → `unknown` → `backupMark` returns `null`.
   - [x] `backupMark` returns `{ label, icon }` with the exact labels in the table. (Review F1: dead `visible` field cut. F2: uploading label is now "Not in OneDrive yet. On its way", true when paused or waiting.)
   - [x] Tests cover every raw state, not connected, no entry, null overview, and the label + icon for each state.
   - **Check:** `npm test` passes.

3. **Reviewed mark (Jony)** · `VideoListItem.tsx`
   - [x] The `•` is replaced by the check-in-circle icon, with `title` and `aria-label` "Reviewed: you marked this call as reviewed".
   - [x] Nothing is drawn when not reviewed.
   - **Check:** it is never a bare dot. Hovering shows the tooltip. VoiceOver reads the words.

4. **Icon set and tooltips (Jony)** · `VideoListItem/` + `03-ui-spec.md`
   - [x] One icon component draws all six icons in one line style. The `✓` glyph is gone from the row.
   - [x] Every icon has `role="img"`, a `title` and an `aria-label` in words, from `backupMark().label` or the Reviewed label.
   - [x] At most two marks per row, in fixed slots (storage, then Reviewed). Nothing else is added to the row.
   - [x] The settle animation and reduced motion still work; storage settles only from `uploading` to safe.
   - [x] Unused CSS (old `.backupMark` glyph styles, `.srOnly` if unused) is removed.
   - [x] `03-ui-spec.md` describes each state: icon, colour, label, when it shows, and how it settles.
   - **Check:** `npx tsc --noEmit`, `npm run lint` and `npm test` pass.

5. **Cleanup review and integration (Eraser)** · `04-cleanup-review.md`
   - [ ] No leftovers: no `•` or `✓` glyphs on the row, no dead labels, no old `BackupState` values, no unused CSS.
   - [ ] No fact is said twice: the row shows this video's state only. Progress, reasons and Retry stay in the cloud popover.
   - [x] Tests pass: `npm run test:all`.
   - [x] Build passes: `npm run build` and `npm run app:build`.
   - [ ] Start opens the new version: `npm run app:start` rebuilds and launches, and the open window shows the new row icons (not the old `•` / `✓`).
   - [ ] All states can be told apart at a glance: cloud only, cloud + this Mac, this Mac only, uploading, stuck and Reviewed each look different by shape, also in greyscale. Hovering each one shows its words.
   - Status (Eraser, 2026-11-25): RETURNED to Jony for F1 (cut the dead `visible` field) and F2 ("Uploading" label shown when paused or waiting); see `04-cleanup-review.md`. The first two boxes wait on those fixes. Start built, installed and launched the new version, but nobody has looked at the window yet, so the last two boxes stay open.
   - **Check:** the review is written and signed off, and every phase above is ticked. If nobody has looked at the window, say so here and leave the last two boxes open.

## Done for the whole item
Each session row shows one storage icon and, when reviewed, one Reviewed icon. Each icon comes from one line set, has a plain tooltip, and can be told apart at a glance. Tests and the build pass, and Start opens this version.

## Out of scope
- The storage engine (Rust), `StorageOverview`, and `CloudStatus` (header icon and popover).
- The header Reviewed toggle (`ActionIsland`).
- Per-row actions (Retry, download, free up space) and per-row percent.
- Settings › Storage and the Training Room.
