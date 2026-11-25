# 03 · UI spec — Performance Review, calm rebuild

Builds on 01-research.md (what's noisy) and 02-magic.md (three quiet moments).
User goal on this screen: **find a call, watch it, write what I learned.**
Everything below serves that, or it went.

## Hierarchy (one scale, four sizes)

| Size token | Used for |
|---|---|
| `--text-size-heading` | Record title in the hero. Nothing else. |
| `--text-size-body` | Notes. |
| `--text-size-label` | Row titles, facts line, inputs. |
| `--text-size-micro` | Row dates, field labels. |

Colours: text, muted text, the outcome colours (only on the outcome glyph), accent for focus. No other tints.

## Session row (Navigation › VideoListItem)

```
[$]  Discovery call with Acme            ✓
     Tue 18 Nov
```

- Line 1: title (label size). Line 2: human date ("Today", "Yesterday", "Tue 18 Nov", year added when not this year), micro, muted.
- Outcome glyph: label size, normal weight, in its outcome colour. It was heading size and bold — the loudest thing in the list. Now the title is.
- Loudness order: title › outcome glyph › reviewed mark › backed-up mark.
- **Reviewed**: the 3px green bar is gone. A small muted dot `•` on the right edge, before the backed-up mark. `aria-label="Reviewed"`.
- **Backed up** (`backup`):
  - `backed_up` → a small `✓`, muted, opacity 0.45. `title` + `aria-label` "Video backed up to OneDrive" (only the video goes up — 02-magic, Q1).
  - `pending` → nothing visible. Screen readers hear "Not backed up yet" (visually hidden text in the row).
  - `not_connected` → no element at all. People who don't use OneDrive never see OneDrive.
- **Settle** (02-magic): when a mark arrives *live* (pending → backed_up, or reviewed ticked) it fades in over 600 ms `cubic-bezier(0.2,0,0,1)`. No animation on first paint. Only under `prefers-reduced-motion: no-preference`.
- Search matches title, date and description.

## Hero

- Title (heading, click to rename) — unchanged.
- **Facts line** under the title replaces the "•••" toggle: `Tue 18 Nov · Closed · 4,000 EUR`, label size, muted. Outcome only when set; amount only when set. Clicking the line (a button, "Edit call details") opens the same edit panel as before. The panel no longer has its own border/box — it sits in the page.
- In the panel: Closed date shows **only** when the call is Closed (it used to sit there disabled). The `0/200` counter shows only in the last 20 characters.
- Notes: no border at rest; a hairline only on focus ring (box-shadow accent). The page is the box.
- **Page turn** (02-magic): when the selected record changes, the title block and notes fade 0.6 → 1 over 140 ms ease-out. The video element never animates. Reduced motion: none.

## Removed, and why

| Gone | Why |
|---|---|
| Bold, heading-size outcome glyph | Out-shouted the title; the glyph is a hint, not the headline. |
| 3px green reviewed bar | A second colour language in the list; replaced by a quiet dot. |
| "•••" toggle | Hid the facts people scan for (date, outcome, amount). |
| Disabled "Closed date" | A control you can't use is noise. Shown when it applies. |
| Always-on `0/200` counter | Only useful near the limit. |
| Panel and notes borders | Boxes inside boxes. Space does the grouping. |

**Not removed here (captain's call, Q4):** the header island's "Generate scorecard" button duplicates the one in Detail. `HeaderIsland` makes those fields required and AppHeader is outside this element, so it stays until Columbo decides.

## Data contract

```ts
type BackupState = "backed_up" | "pending" | "not_connected";
VideoRecord.backup: BackupState
```

`toBackupState(raw)` (in `PerformanceReview.backup.ts`, re-exported by `PerformanceReview.data.ts`) is the only reader of the storage engine's per-video status. `backupStateFor(overview, spaceId, recordId)` finds the video and calls it.

| Engine says | backup |
|---|---|
| no overview, or `connected: false` | `not_connected` |
| no entry for this video | `not_connected` |
| `safeOnMac`, `inCloud` | `backed_up` |
| `waiting`, `uploading`, `checking`, `paused`, `notUploadedFull`, `notUploadedUnreadable`, `missing` | `pending` |

`backupMark(state)` decides what the row draws (`null` | `{ visible, label }`), so the rule is tested without a DOM (`src/lib/performanceReview/backupMark.test.mjs`).

## Accessibility

- Row stays one `<button>`; marks are text inside it, so the accessible name reads "Discovery call… Tue 18 Nov Reviewed Video backed up to OneDrive".
- Marks are not the only signal of anything critical; contrast for muted text meets AA at its size on the row background — the 0.45 opacity check mark is decorative and duplicated in the label.
- Facts line is a real button with a visible focus ring (box-shadow, never `outline`).
