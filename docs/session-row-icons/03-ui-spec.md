# Session row icons: UI spec

Designer: Jony (Magic UX) · 2026-11-25
Builds `00-roadmap.md`, grounded in `01-research.md`. Next: Eraser (`04-cleanup-review.md`).

## User goal
Look down the list and know two things without clicking: **which calls are still to review**, and **is each call safe, and will it play here**.

## What I removed, and why
- `•` for Reviewed: a dot reads as "unread / new", the opposite of what it means.
- `✓` for storage: in this app the check means Reviewed (header toggle). The row now has exactly one check, and it means Reviewed.
- The screen-reader-only "Not backed up yet" text (`.srOnly`, `visible: false`): every state now has a real icon with its own `aria-label`.
- The faded resting opacities (0.45 / 0.7): a thin line icon at 0.45 fails 3:1 non-text contrast. Quiet now comes from the muted colour and small size, not from fading.
- No percent, no per-row Retry, no motion on the row: the header cloud popover holds those (one place per action).

## Row layout
```
[outcome glyph]  Title ……………………………  [storage] [reviewed]
                 date
```
- Order is unchanged: outcome glyph, title over date, then the marks.
- Two fixed slots, 14 × 14 px, 0.4 rem apart: **storage first, then Reviewed**. A slot keeps its width when it is empty, so the marks line up as columns down the list. At most two marks per row, and no text.
- Reviewed sits at the far right edge, where the eye lands for the daily "what's left?" scan.

## Icon set (`VideoListItem/RowIcon.tsx`)
One component draws all six icons. They share a 16-unit viewBox, are drawn at 14 px with a 1.5 stroke, round caps and joins, no fill, and take their colour from `currentColor`. Cloud means OneDrive and the laptop means this Mac, and the two shapes add up. Storage never uses a check.

The svg is `aria-hidden`. Its slot `<span>` carries `role="img"`, `title` (the tooltip) and `aria-label`, both set to the same words.

## States

| State | When it shows (raw data) | Icon | Colour | Tooltip + aria-label |
|---|---|---|---|---|
| unknown | storage overview not read yet | none (slot empty) | – | – |
| cloud only | `inCloud` | `cloud`: cloud alone | `--color-text-muted` | In OneDrive only. Plays from the cloud |
| cloud + this Mac | `safeOnMac` | `cloudDevice`: small cloud top-left, laptop bottom-right | `--color-text-muted` | On OneDrive and this Mac |
| this Mac only | OneDrive not connected, or no entry for this video yet | `device`: laptop alone | `--color-text-muted` | Only on this Mac. Not uploaded yet |
| uploading | `waiting`, `uploading`, `checking`, `paused`, any new state; also with a passing `lastError` | `cloudUp`: cloud with an up arrow inside (static) | `--color-text-muted` | Not in OneDrive yet. On its way |
| stuck | `notUploadedFull`, `notUploadedUnreadable`, `missing` (same list as `STUCK` in `CloudStatus.script.ts`) | `cloudAlert`: cloud with `!` inside | `--color-status-failed` | Upload stuck. Open the cloud icon at the top to see why |
| Reviewed | `video.reviewed` is true | `reviewed`: check in a circle | `--color-reviewed` | Reviewed: you marked this call as reviewed |
| not reviewed | `video.reviewed` is false | none (slot empty) | – | – |

Shape alone tells the states apart, so the row also reads in greyscale: cloud, cloud + laptop, laptop, cloud + arrow, cloud + `!`, circle + check. Colour only adds to it: red for stuck, green for Reviewed.

Safety rule: only `inCloud` and `safeOnMac` draw a cloud with no arrow or `!`. `checking` stays "uploading".

The stuck colour uses the existing `--color-status-failed` token. There is no separate warning token, and I didn't add one.

## Motion
- **Settle:** a mark that arrives live fades in from 0 to 1 opacity over 600 ms on `cubic-bezier(0.2, 0, 0, 1)`.
  - Storage settles only when the row goes from `uploading` to `cloud_and_local` or `cloud_only`. It never settles from `unknown`, so rows don't all fade in when the app opens, and never into local only or stuck.
  - Reviewed settles when it turns on while the row is on screen.
- **Reduced motion:** the animation only runs under `prefers-reduced-motion: no-preference`. Otherwise the mark simply appears.
- Nothing on the row moves. Progress motion lives in the header ring.

## Accessibility
- The row is a `<button>`, so VoiceOver reads the title, then the date, then the storage words, then "Reviewed: …".
- Contrast: `--color-text-muted` on the surface is about 4.8:1, and green and red are both above 3:1, which passes non-text contrast in light mode.
- The tooltip appears after the usual hover delay (native `title`). The icons are not separate tab stops: the whole row is the one control.

## Build notes
- `PerformanceReview.backup.ts`: `BackupState`, `toBackupState`, `backupStateFor`, `backupMark(state) → { label, icon } | null`, `StorageIcon`.
- `VideoListItem.tsx`: two `position.slot` spans; `styles.mark` (+ `styles.stuck` / `styles.reviewed`); `useArrivedLive(value, arrives)` takes a predicate.
- Tests: `src/lib/performanceReview/backupMark.test.mjs` covers every raw state, not connected, no entry, a null overview, `lastError`, and the label and icon for each state.

## Open, for Eraser at Start
- Not connected shows the laptop on every row. Decided (Pixel): keep it. It's true, and drawing nothing would look the same as unknown.
- Paused and waiting share the uploading state and icon. Decided (review F2): the label says "Not in OneDrive yet. On its way", which is true for waiting, uploading, checking and paused, and never says "uploading", matching the header popover.
