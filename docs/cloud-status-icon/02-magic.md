# Cloud status icon: three quiet touches (magic)

Author: Merlin (Magic Director). Phase 2 of `00-roadmap.md`.
Reads: `01-research.md`, `principles/magic-ux/how-we-work.md`, and the motion language already shipped in `docs/performance-review-redesign/02-magic.md` (the `settle` animation in `VideoListItem.styles.module.css`). Jony builds these and Eraser checks them.

## The feeling we're after
The person has just finished a call and dropped in a 2 GB recording. They feel a faint "that call mattered, I hope it's safe" worry. The icon's job is to **let them stop thinking about it**. So it behaves like a good porter: it takes the bag, works quietly, and when the job is done it simply has empty hands. It never waves for attention.

## The world: the same one as the rest of the screen
**"Things that become true settle in."** Performance Review already uses it: the backed-up check and the reviewed mark fade in when they become true, and nothing moves on load. The cloud icon speaks the same language, so the whole screen keeps one voice:

- **The ring is wet ink.** While it's there, something is still happening.
- **The plain cloud is dry ink.** It's a fact you can rely on: every video is safe. This is the promise from research insight 1.
- **So the plain cloud is never decorated.** When everything is safe, the icon has *less* on it, not more. Done means the ring is gone, and there's no tick, glow or badge.

Labels stay plain. "Ink", "fill" and "settle" are only our build names and never appear in the app.

## Rules for every touch
1. **Nothing moves while idle.** No motion when nothing changes. No loops, pulses, spins or breathing, in any state, ever.
2. **Nothing animates on first render.** When the screen opens, the icon is drawn in its current state at once: idle, a ring at its current percent, a muted ring, or the problem dot. Motion is only for a **live change** seen while the screen is open. Keep the previous `cloudState` and percent in a `useRef`, the same pattern `VideoListItem` uses for `settle`.
3. **Opacity and ring length only.** No scale, no movement and no colour bursts. Nothing shifts the layout or moves under the cursor.
4. **Never show more progress than is true.** The ring only animates *to* a value the data has reached. It never runs ahead to fill the gaps between updates.
5. **Reduced motion:** every motion here sits inside `@media (prefers-reduced-motion: no-preference)`, so under `reduce` every change is instant. Static holds (touch 2) stay, because they aren't motion.
6. **No sound.** The screen is used with call audio in headphones (as in the earlier magic doc).

## The three touches

### 1. "Fill": the ring follows the bytes like water, never runs ahead
- **Fires:** every time the overall percent changes while `cloudState` is `uploading`, i.e. on each `storage://changed` refresh, or on the re-read timer if Jony adds one (research open question 3).
- **What happens:**
  - The ring's arc (SVG `stroke-dashoffset`) moves from the old percent to the new one with **800 ms `cubic-bezier(0.2, 0, 0, 1)`**. Updates arrive unevenly, one per chunk, and the long soft ease turns those jumps into what reads as a steady flow. If the next update comes in mid-transition, the browser simply retargets from where it is, so nothing needs a JS timer.
  - **Starting:** going live from `idle` to `uploading`, the ring **appears at its current percent** and fades from opacity 0 to 1 with `settle` (**600 ms `cubic-bezier(0.2, 0, 0, 1)`**). It never sweeps up from 0. A resumed upload at 40 % shows 40 % (research insight 6).
  - **Going down:** if the percent falls because a new video was queued and the total grew, the ring **snaps** to the new value with no transition. Draining backwards would look like an upload being undone. A snap reads as "more work was added", which is what happened.
  - **Paused** (offline, Keychain wait, or a server hiccup waiting on `retryAt`, if Jony and Columbo keep a paused look; see research insight 2): the ring **holds its exact percent** and its stroke changes from `--color-accent` to `--color-text-muted` with a **300 ms `ease-out`** colour transition. Nothing else moves. Back online, it changes back the same way and filling carries on from the same point.
- **Reduced motion:** the arc jumps to each new value, the ring appears and disappears at once, and the paused colour changes at once.
- **What it means:** "it's moving, and this is honestly how far." Muted means waiting, not broken.
- **What the user feels:** they can read it at a glance without clicking (research #4). While they rewatch the call, it seems to fill by itself, calmly, like a glass under a slow tap.
- **Repeats often?** Yes, many times per upload. That's why it's only the arc length, with no flash, tick or number change on the icon.
- **Heavy?** Very light. One SVG circle, a CSS `transition` on `stroke-dashoffset` and `stroke`. Add a `.noTransition` class for the one render where the percent went down, and on first render.

### 2. "Settle": when the last upload lands, the ring dries into the plain cloud
- **Fires:** only on a **live** change from `uploading` to `idle`, meaning the last video just became `inCloud`/`safeOnMac` while the screen is open. Not on load, and not when going from `problem` to `idle` (see touch 3).
- **What happens, in order:**
  1. The ring fills the last stretch to 100 % using the normal Fill transition (up to 800 ms).
  2. It **holds full for 400 ms**, so the eye can catch the "done" if it happens to be looking.
  3. The ring **fades out** from opacity 1 to 0 with **600 ms `cubic-bezier(0.2, 0, 0, 1)`**, the same curve as the row's `settle`, playing in reverse. The plain cloud stays, unchanged, and nothing replaces the ring.

  Total: about 1.0 to 1.8 s, and it never blocks anything. Make it a CSS keyframe (`settleOut`: 0–40 % hold at opacity 1, 40–100 % fade to 0, `1000ms`) started by a `.landing` class, then remove the ring element on `animationend`. If the state goes back to `uploading` during the fade, drop `.landing` and the ring is simply there again at its new percent.
- **Sync with the rows:** the row check for the same video fades in with its own `settle` (600 ms) on the same `storage://changed` refresh. The two fades run side by side, so the screen tells one story: the row says "this call is safe", and the icon says "and so is everything else". Don't add a delay to line them up.
- **If the popover is open:** its text swaps at once to the idle sentence, with no animation inside the popover. Words should be read, not watched.
- **Reduced motion:** the ring shows full (still) for 400 ms, then is removed with no fade. The hold isn't motion, and it keeps the "done" moment readable.
- **What it means:** "the promise is kept. You can stop thinking about it." Done looks like *less*, because the work is over.
- **What the user feels:** if they're watching, a small exhale, like seeing the delivery driver pull away with the parcel. If they aren't, they miss nothing: the plain cloud is simply there next time, which is the whole point.
- **Heavy?** Very light. One keyframe and one class, with the previous state kept in a ref.

### 3. "Quiet knock": a problem appears as a small still dot, never an alarm
- **Fires:** on a live change into `problem` (signed out, revoked, cloud full, unreadable/full/missing video; per research insight 3, not a short server hiccup or plain offline). On first render, the dot is just there.
- **What happens:**
  - A small solid dot (about 5 px at an 18 px icon, Jony's call) sits at the cloud's lower right, inside a 1.5 px ring in the header background colour so it reads cleanly against the cloud. Colour: `--color-accent`. **Not red**: the icon is often in view during screen-shares (research #12), and most problems don't mean anything was lost.
  - It fades in from 0 to 1 with **600 ms `cubic-bezier(0.2, 0, 0, 1)`**, the same `settle`. **Once.** No pulse, no shake, no repeat, and it doesn't come back if the popover is opened and closed.
  - If an upload ring was showing, it goes to the paused, muted look (touch 1) under the dot. The dot is the only accent-coloured thing on the icon, so it wins by shape and colour, not by motion.
  - **Clearing it:** when the problem is fixed (for example Retry works, or sign-in succeeds), the dot **disappears at once**, with no fade-out, as with the row marks: a truth that stops being true shouldn't linger. If uploads then resume, the ring changes back to accent (touch 1). When they finish, touch 2 plays as usual.
- **Reduced motion:** the dot appears and disappears at once.
- **What it means:** "when you have a moment, there's one thing only you can do." It's a knock on the door, not a fire alarm. The popover's first line then says the video is still safe on this Mac (research D3).
- **What the user feels:** they notice it at their own pace, without a jolt of fear, and they aren't embarrassed in front of a manager. The dot's shape is different from the ring, so it's clear without relying on colour.
- **Heavy?** Very light. One absolutely positioned span and the existing `settle` keyframe.

## Shared values (put them in one place in the CloudStatus css)
| Name | Value | Used by |
|---|---|---|
| fill | `stroke-dashoffset 800ms cubic-bezier(0.2, 0, 0, 1)` | ring progress (touch 1, 2.1) |
| tint | `stroke 300ms ease-out` | ring to and from muted when paused (touch 1) |
| settle | `600ms cubic-bezier(0.2, 0, 0, 1)`, opacity 0 → 1 | ring appearing (1), problem dot (3). It's the same curve as `VideoListItem`'s `settle`. |
| settleOut | `1000ms`, hold 0–40 %, then `cubic-bezier(0.2, 0, 0, 1)` opacity 1 → 0 | ring leaving when all is safe (2) |

Everything above is inside `@media (prefers-reduced-motion: no-preference)`. Under `reduce`: instant changes, with only the 400 ms still hold in touch 2.

## State × motion at a glance
```
from \ to     idle              uploading            paused (muted)       problem
(first load)  plain cloud       ring at %, still     muted ring, still    dot, still
idle          –                 ring settles in      ring settles in*     dot settles in
uploading     Settle (touch 2)  Fill                 tint → muted         tint → muted + dot settles in
paused        Settle (touch 2)  tint → accent        –                    dot settles in
problem       dot gone at once  dot gone, tint back  dot gone             –
```
\* already muted. If the team keeps 4 states and folds paused into `uploading` with a muted ring, read "paused" as "uploading + muted".

## Words: not mine to write
The popover copy comes from the research (the SPEC 6.2 lid sentence, `problemNotice()`, `videos()`, `formatBytes`). I add nothing. One request from the magic side: the ETA text only changes **by a rounded step**, with no number ticking and no animation on the text.

## Ideas I tried and cut
| Idea | Why cut |
|---|---|
| A slow "breathing" or drifting cloud while uploading | Motion with no new information, and it pulls the eye during a review. The ring already says "moving". |
| Smoothly running the ring ahead between updates (guessing speed) | It shows progress that isn't true yet. That breaks "never show safe before it's true" and invites the iCloud "stuck pie" feeling when the guess stalls. |
| A tick or check flashing in the cloud on completion | A second "safe" sign (the row checks already do this). Done should look like *less*, not more. |
| Little upward drift or rain particles on the cloud | Cute once, tiring the 100th time, and noise at 18 px. |
| Pulsing or shaking the problem dot | An alarm. It's embarrassing on screen-share, and a fix it can't speed up. |
| Red problem colour | Most problems lose nothing. Red says "lost". Shape plus accent colour is enough. |
| A count badge ("2") on the icon | It's Drive's pattern, but it's a second number to read. The popover already says "2 videos left". |
| Ring draining backwards when a video is added | Looks like an upload being undone. A snap is more honest. |
| Ring sweeping from 0 on resume or on load | Says "starting over" when the upload actually resumes (research insight 6). |
| Animating popover contents (rows sliding, numbers counting) | Words are for reading. Counting numbers slow the "can I close the lid?" answer. |
| A soft chime when everything is safe | The screen is used with call audio in headphones. Out of scope anyway (no sound). |
| A "luggage tag" or "posted letter" world | Lovely meaning (hand it over and forget it), but it needs a new picture on the icon and explaining. The ink world already lives on this screen. |
| A moon-phase or hourglass icon | It replaces a cloud people recognise from Dropbox, iCloud and Drive. Familiar beats clever for a glance. |
| Hover lift or glow on the icon | Its hover is the normal button hover the header already uses. Nothing extra. |

## Hand-off
- **Jony:** build the three touches from the four shared values. Use an SVG ring (track plus arc) around or under the cloud glyph, and the dot as a separate span. Keep the previous `cloudState` and percent in a ref, so motion only plays on live changes and percent drops snap. Remove the ring on `animationend` after `settleOut`. Put every motion behind the reduced-motion guard. If you pick different sizes or colours, note them and the reason in `03-ui-spec.md`. The timings and the "no motion at rest" rule should stay.
- **Eraser:** check that nothing moves while idle or on first load; that no loop, pulse or spin exists anywhere; that the ring never sweeps from 0 when resuming and never runs ahead of the data; that the problem dot isn't red and appears once; and that with reduced motion on, every change is instant apart from the still 400 ms hold.
- **Columbo:** touch 3 assumes your research insight 3 (problem = only things the user must act on). If the brief's original `cloudState()` stays (offline and any `lastError` = problem), the dot will show and hide often, and that would make this touch noisy. My vote is for your version.
