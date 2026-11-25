# Cloud status icon: UI spec

Author: Jony. Phase 3 of `00-roadmap.md`. Builds on `01-research.md` and `02-magic.md`.

## User goal
"Is my call recording safe, and can I stop thinking about it?" Most checks are a glance at the icon. The click is for "can I close the lid?" and "something looks wrong".

## What I removed and why
- **The banner (`StorageStatusLine`)** under the video list. It took a full-width row and always spoke, even with nothing to say. The icon says the same at a glance.
- **A speed number ("4.2 MB/s").** Research: speed is optional, and nobody acts on it. The rounded time left answers the real question.
- **A Retry button for passing server hiccups.** The engine already retries them. Retry appears only when `problemNotice()` asks for it (unreadable files).
- **A second Settings link.** One link at the bottom. Its words change when the fix lives there ("Sign in to OneDrive" / "Manage storage").
- **A new popover shell.** It reuses `AnchoredPopup` + `useAnchoredPopup` (Esc, click outside, scroll closes it).

## Placement
The empty right area of `AppHeader`. A page sets it through a new `accessory` slot in `AppHeader.context.tsx`; only Performance Review sets it. 28 px square button (tap target), 18 px cloud glyph.

## States (`cloudState()` in `CloudStatus.script.ts`)
| State | When | Icon | aria-label |
|---|---|---|---|
| hidden | no overview, or not connected | nothing | – |
| idle | every video `safeOnMac` or `inCloud` | plain muted cloud | "All videos safe in OneDrive" |
| uploading | any other video still on its way | cloud + accent ring at the honest percent | "Uploading, N% done" |
| uploading, paused (`isPaused()`) | offline, Keychain wait, a transient `lastError`, or a `paused` video | same ring, muted | "Uploads paused, N% done" |
| problem | signed out, revoked, OneDrive full, or a video unreadable / not uploaded (full) / missing | cloud + 5 px accent dot, lower right (muted ring under it if something is still moving) | "OneDrive needs you" |

Ring percent = bytes done ÷ bytes total over the videos still on their way (`checking` counts as 100 %). Problem videos are left out.

## Popover (one column, 280 px, label-size text)
In the research order, except that in the problem state the problem comes first, because that's why they clicked.
1. **Problem** (problem state, or Keychain wait): `problemNotice()` lead in bold + rest. Action `retry` → a Retry button (`retryUnreadableVideos()`).
2. **Uploading:** the lid sentence, word for word: "If you quit or close the lid, uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe." **Idle:** `statusLine()` text ("All N videos safe in OneDrive").
3. `N videos · X GB left` (`videos()`, `formatBytes()`).
4. Time left, muted, in rounded words: "Less than a minute left", "About N minutes left" (1-min steps under 10, then 5-min steps), "More than an hour left". Shown only after ≥ 10 s of samples in a 20 s window with bytes falling. Never while paused. Offline: the `statusLine()` offline sentence instead.
5. Passing errors, muted: "fileName: lastError · retrying in a moment".
6. One link: "Storage settings" → `/settings?section=storage`.

Empty, loading, error: no overview yet → hidden. A failed read logs and keeps the last overview (the hook already does this).

## Live data
`useStorageOverview()`. While uploading, `refresh()` every 3 s so the ring and time left keep moving between `storage://changed` events.

## Motion
Exactly `02-magic.md`: Fill (800 ms), tint (300 ms), settle in (600 ms) for ring and dot, settleOut (1000 ms) on a live uploading → idle, snap when the percent drops, nothing on first render, all inside `prefers-reduced-motion: no-preference` (only the 400 ms full hold stays under reduce). No change to sizes or colours.

## Accessibility
Button with `aria-haspopup="dialog"`, `aria-expanded`, and the state in `aria-label`. Focus ring is a 2 px accent `box-shadow`. Popover is `role="dialog"` with a label. Text uses the theme's 5 colours and 4 sizes only.
