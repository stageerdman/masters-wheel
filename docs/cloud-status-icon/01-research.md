# Cloud status icon: how people check uploads (research)

Author: Columbo (Magic UX). Read by Merlin (02), Jony (03) and Eraser (04).
Builds on `docs/onedrive-storage/01-research.md` and `docs/performance-review-redesign/01-research.md`. Things from there that still hold are only referred to here, not repeated.

## Summary

People don't open an upload indicator to watch it. They want an answer to one question: **"Is my call recording safe, and can I stop thinking about it?"** Most checks are a glance of under a second at the icon, with no click. The click (the popover) is for two other moments: a long upload just before leaving ("can I close the lid?"), and something that looks wrong.

Five things matter most for the MVP:

1. **The resting icon is a promise.** The calm "idle" cloud must mean that every video really is safe in OneDrive, never "nothing is moving right now".
2. **Normal life isn't an error.** Being offline, a short server hiccup that retries on its own, and a sleeping Mac should all look *paused or waiting*, not *problem*. The current brief marks `!online` and any `lastError` as `problem`. I think that's too loud (see insight 2).
3. **The ETA people want is coarse and honest:** "about 10 minutes left", or nothing. They don't want MB/s. The answer they need most isn't really a time at all: "you can close the lid, uploads pick up where they left off".
4. **A real problem needs one fix in one place.** Two buttons already exist: `retryUnreadableVideos()` for files that couldn't be read, and `wakeStorage()` for "try again now". Signing in again stays a link to Settings.
5. **The icon and the per-session checks must never disagree.** If any row lacks its check, the icon can't look all-safe.

## Scope

**In:** the cloud icon at the top right of Performance Review and its popover, for the moments in the brief: the quick glance, a long upload, an error and Retry, offline or signed out, and how the icon relates to each session's faint backed-up check.

**Out, and why:**
- Downloads, switching modes and disconnecting. They happen in Settings › Storage, which keeps its own panel. *(Assumption: while those run, the icon can show them as "moving", but researching them is out of scope.)*
- Engine changes such as a real speed field or background uploads while the app is closed. The brief says the engine stays as it is.
- Notifications, Dock badge, sound. These are out of scope in `docs/onedrive-storage/SPEC.md`.
- Other screens. The icon lives only in Performance Review.

## Who and when

Same people as the earlier research: solo salespeople, coaches and consultants. They record client calls on a MacBook and review them in Master's Wheel. Roughly half have connected OneDrive. Recordings are large (often 0.5 to 3 GB), so an upload takes minutes over a normal connection, and longer on hotel or train Wi-Fi.

The typical rhythm: a call ends, they drop the recording in, review it while it uploads, and close the laptop to go to the next meeting. At the end of the day they close the lid for the night.

## How Dropbox, iCloud and Google Drive show sync status

| | Dropbox | iCloud Drive | Google Drive for desktop |
|---|---|---|---|
| **At rest** | Menu bar icon for the whole account. The panel says "Your files are up to date". | No menu bar icon at all. Silence means fine. | Menu bar icon. The panel's home screen has a "Sync status" tile. |
| **Moving** | The icon animates. The panel lists the files. | A small **pie chart** next to iCloud Drive in the Finder sidebar fills as the transfer goes. Clicking it shows "466 MB of 1.2 GB". | Sync arrows, plus a **count badge** of queued items. |
| **Speed / ETA** | The time-left readout was removed, with "inaccurate" given as the reason. It came back and went away again. Forum users keep asking for it, mostly to know "can I shut down yet?" | None. Only counts and sizes. | None in the menu. |
| **Problems** | "N files can't sync" in the panel, and a different icon. | A per-file icon. Stuck pies are a common complaint, and nothing explains them. | Time-sensitive errors show as notifications. A paused sync uses the same icon as syncing, which confuses people. |

**What carries over:**
- **One icon for the whole account, with details on click.** All three work this way, so people already expect it at the top right. A small fill (iCloud's pie) is the most familiar way to show progress.
- **Counts and sizes are trusted, time estimates aren't.** Every product shows "N items / X of Y GB". Dropbox learned that a jumpy ETA hurts trust more than having none.
- **Paused looking the same as syncing (Drive), and stuck with no reason (iCloud), are the top complaints.** People want to know *why* it isn't moving, and whether they need to do anything.

Sources: [Dropbox sync icons (macOS)](https://help.dropbox.com/sync/macos-sync-icons), [Dropbox: check if files are syncing](https://help.dropbox.com/syncing-uploads/sync-time), [Dropbox forum: Time Left removed](https://www.dropboxforum.com/t5/Syncing-and-uploads/Time-Left-in-Sync-has-been-removed-Feature-Request/m-p/333318), [Dropbox forum: show upload speeds](https://www.dropboxforum.com/discussions/101001016/show-upload-speeds/807953), [Apple: iCloud Drive status on Mac](https://support.apple.com/guide/mac-help/mchlc994344b/mac), [OSXDaily: iCloud Drive upload progress](https://osxdaily.com/2017/06/22/watch-icloud-drive-upload-progress-mac/), [Google: Use Drive for desktop](https://support.google.com/drive/answer/10838124).

## What the data says today (facts from the code)

- `useStorageOverview()` re-reads the overview on every `storage://changed` event. There's no timer, so while nothing changes, nothing updates.
- `lastError` + `retryAt` are set **only for short server trouble** (`CloudError::Transient`, or "OneDrive lost track of the upload"). The engine **retries on its own** with a growing wait (10 s, 20 s, 40 s … up to a cap). They're cleared as soon as a try works. So they mean "retrying soon", not "you must act".
- Offline, signed out, revoked and cloud full are **account-wide flags**, not `lastError`.
- The problems that do need the user show up as **video states**, not as `lastError`: `notUploadedUnreadable` (fix: `retryUnreadableVideos()`), `notUploadedFull` (fix: free up OneDrive), `missing` (deleted in OneDrive).
- `wakeStorage()` clears every wait and tries again now. It's the honest "Try again" button.
- Uploads **pause** when the app quits or the Mac sleeps, and pick up at the same percent next time (resumable upload). Closing the lid can never lose a video, because the local copy stays until it's safe.
- `signInPending` (waiting for Keychain) exists, and isn't a problem.
- Each row's backed-up mark comes from `isBackedUp()` in `src/lib/onedrive/backedUp.ts`. It's true only when every video in the session is `safeOnMac` or `inCloud`.

## Behavior table

L = likelihood, F = frequency (1–10). Sorted by L + F.

| # | Behavior | L | F | Reason |
|---|---|---|---|---|
| 1 | **Glance: is everything safe?** | 9 | 9 | Happens without a click, every time the eye passes the top right. Careful keepers do it after every new recording. It's the main reason the icon exists. |
| 2 | **Glance at the row's check** | 8 | 8 | People look at the session they're working on, not at the account. The faint check is read in passing on every visit. The two signals must agree. |
| 3 | **Before leaving: "can I close the lid?"** | 8 | 7 | Calls are back to back, and big files are still uploading when the next meeting starts. One click to the popover, then the laptop closes. |
| 4 | **Watch a long upload while reviewing** | 7 | 7 | Right after dropping in a 2 GB recording, people peek at the progress a few times while they rewatch the call. The ring answers it without a click. |
| 5 | **See something went wrong, and fix it** | 7 | 4 | Real problems (unreadable file, OneDrive full, signed out) are rare, but every connected user will meet one at some point. Rated low on frequency, but kept as a deep dive because trust breaks here. |
| 6 | **Work offline (train, plane, hotel)** | 7 | 5 | Common for people who travel. The user did nothing wrong, so it must not look like an error. |
| 7 | **Signed out by an expired sign-in** | 6 | 3 | Happens every few weeks or months with Microsoft accounts. It needs action, so it's a real problem. |
| 8 | **Click the icon to find Settings** | 6 | 3 | "Where do I change Smart / Backup?" The banner used to lead there, so people will expect the icon to as well. One Settings link is enough. |
| 9 | **Check after a restart or next morning** | 6 | 4 | "Did last night's upload finish?" Opening the app is what makes it pick up again, so the popover must show it continuing, not failed. |
| 10 | **Hover for a tooltip instead of clicking** | 6 | 5 | Mac users hover icons. It's a cheap way to get the one-line answer. *(Assumption, not checked with users.)* |
| 11 | **Retry over and over during a server hiccup** | 4 | 2 | An impatient user hammers Retry. It's harmless (`wakeStorage` only skips the wait), but it shouldn't seem to be needed. |
| 12 | **Screen-share with a manager** | 4 | 2 | An animated or red icon while sharing feels embarrassing. Another reason to keep it quiet. |

### Watch out (low score, high trust risk)
- **A false "all safe".** If the icon is idle while a video is `paused`, `waiting` with nothing moving, `notUploadedUnreadable`, `notUploadedFull` or `missing`, the user closes the lid believing something untrue. The brief's `cloudState()` rules leave this gap: unreadable, full and missing videos carry no `lastError`, and `paused` isn't in the uploading list. This is the most important finding for Jony.
- **The icon disappears and something gets lost.** `hidden` when `connected` is false hides the old banner's "N videos in OneDrive · connect to play them" line. Those videos won't play until the user connects again. *(Open question 1.)*
- **A false alarm every few minutes.** If any `lastError` counts as a problem, a single 500 from OneDrive flips the icon to problem for 10 seconds and back. People learn to ignore it, and then miss the real one.
- **The ETA jumps around**, for example "2 min" then "40 min". It reads as broken, so it's worse than showing none.

## Deep dives

### D1 · The quick glance: "is everything safe?" (#1, L9 F9)
- **The moment:** any time during a review session, at the desk, on the MacBook. They've just dropped in a recording, or they're rewatching yesterday's call. The eye drifts to the top right on its way to something else.
- **The trigger:** none on purpose. It's background reassurance, the same habit as glancing at the battery icon.
- **Thoughts:** "Is the cloud doing something? …No. Good, it's all up." / "Still going, fine."
- **Emotions:** before: a faint, low-level worry ("that call was important"). During: none if the answer is clear. After: relief, and then they forget about it.
- **Expectations:** the answer in **under a second, with no click**. Three looks they can tell apart by shape, not just colour: calm (all safe), moving (a fill or ring), needs-me (a small mark). No motion at rest.
- **Success:** they never consciously think about uploads.
- **Friction and fears:** an icon that animates while idle (it pulls the eye during a review); colour as the only signal; an idle look that turns out to be wrong; an icon that looks the same for "paused" and "uploading" (Drive's top complaint).
- **Product insight:** idle must mean **every video is `safeOnMac` or `inCloud`**, the same rule as `isBackedUp()`, applied to all videos. Anything else is either moving or paused. The glance is the main thing the icon does. The popover comes second.

### D2 · During a long upload: "can I close the lid?" (#3 + #4, L8 F7)
- **The moment:** 2 to 5 minutes after a call ends, with a 2 GB recording uploading. The next meeting is in 3 minutes. Laptop, maybe on battery, about to be closed and put in a bag.
- **The trigger:** the ring is still part-filled, and they're about to leave.
- **Thoughts:** "If I close it now, does it break? Do I lose the upload? Does it start over? How long is left? Can I wait 2 minutes or not?"
- **Emotions:** before: in a hurry and a little anxious. During: they want a yes or no, not a dashboard. After: calm if they get "yes, it picks up where it left off". If they guess wrong, they feel guilty and keep checking all through the next meeting.
- **Expectations:** one click and the answer. What they need, in order:
  1. **Is it safe to close?** "You can close the lid. Uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe." (That's the existing, true sentence from SPEC 6.2. Keep it word for word.)
  2. **How much is left:** "1 video · 1.4 GB left". Both come from existing data (`videos()`, `formatBytes(uploadBytesLeft)`).
  3. **Roughly how long:** "about 4 minutes". This tells them whether waiting is worth it.
- **Success:** they close the lid knowing nothing is lost, and the next time they open the app it carries on from the same point.
- **Friction and fears:** no answer to "can I close it?"; an ETA that jumps; a percent that restarts at 0% after waking (the engine resumes, so the ring must too); MB/s numbers they have to work out in their head.
- **What speed and ETA they really need:**
  - **Time left, in plain rounded words**, never raw speed. "Less than a minute", "about 3 minutes", "about 20 minutes", "more than an hour". MB/s is a power-user detail and doesn't answer the job. At most, show it in small text after the time.
  - **Only when it's steady.** Work it out from how `uploadBytesLeft` falls over a rolling ~20 s window. Show nothing until there's enough data (at least ~10 s of real movement). Round so it doesn't flicker, and only let it change by a step, not every tick. While paused or offline, show no ETA at all, just the reason.
  - **An update even when no event comes.** Speed needs `uploadBytesLeft` over time. The hook only re-reads on events. *Assumption, to check in the build:* the engine emits `storage://changed` often enough during an upload (per chunk). If not, the client must re-read on a timer while uploading, otherwise the ETA will freeze.
- **Product insight:** the popover's first line answers "can I close the lid", the second gives what's left, the third the rough time. Speed is optional. Leaving out an ETA is fine. A wrong one isn't.

### D3 · Something went wrong, and Retry (#5, L7 F4 — kept for trust)
- **The moment:** at any time, often the morning after or right after adding a file. The icon shows its needs-me mark.
- **The trigger:** the icon looks different. Or a session row is missing its check and they wonder why.
- **Thoughts:** "Did I lose the recording? Is it my fault? What do I click?"
- **Emotions:** before: a spike of worry. The very first thing they need is "your video is still on this Mac". After a fix: relief. If there's no fix: helplessness, and they stop trusting the whole feature.
- **Expectations:** the popover names **which** video ("'Call with Acme' couldn't be uploaded"), **why** in plain words, **that it's still safe on this Mac**, and **one button** that fixes it right there. No hunting through Settings for the common case.
- **The real cases and their one fix** (from the data):

| Case | Data | Is it the user's problem? | One fix |
|---|---|---|---|
| Server hiccup | `lastError` + `retryAt` in the future | **No.** It retries on its own. | Nothing needed. Optional quiet "Try now" → `wakeStorage()`. |
| File couldn't be read | state `notUploadedUnreadable` | Yes | **Retry** → `retryUnreadableVideos()` |
| OneDrive full | `cloudFull`, state `notUploadedFull` | Yes | "Manage OneDrive storage" (link out) |
| Signed out | `!signedIn` (and not `signInPending`) | Yes | "Sign in" → Settings › Storage |
| Access removed by org | `revoked` | Yes, but they can't fix it | Text only: "Your videos on this Mac are fine." |
| Missing in OneDrive | state `missing` | Yes | Text only, as in today's `problemNotice()` |

- **Success:** one click and the mark goes away, or a clear sentence saying nothing is lost and what will happen.
- **Friction and fears:** "Failed" wording for something that heals itself; a Retry button that does nothing visible; a big red icon (alarm and shame during a screen-share); an error that names no video.
- **Product insight:** "problem" should be reserved for **cases where the user has to act**. `problemNotice()` in `panelText.ts` already ranks them and writes the sentences, so reuse it rather than writing new copy. A transient `lastError` belongs to the moving or paused state, with "retrying in a moment" text in the popover. *(This contradicts the brief's `cloudState()` rule. Captain decision, see open question 2.)*

### D4 · Offline or signed out (#6 + #7, L7 F5 / L6 F3)
- **The moment:** offline: on a train or plane, or on hotel Wi-Fi behind a captive portal. Signed out: some ordinary morning, weeks after connecting.
- **The trigger:** the icon looks different from usual. Or they don't notice at all, which is fine for offline but not for signed out.
- **Thoughts:** offline: "Right, no Wi-Fi. It'll catch up." Signed out: "Why did it stop? Did I do something?"
- **Emotions:** offline: neutral, as long as the app doesn't scold them. Signed out: mild worry, then annoyance if they can't fix it quickly.
- **Expectations:** offline: a quiet paused look and one line: "Offline · uploads continue when you're back." Nothing to click. Signed out: a clear needs-me mark, "Signed out of OneDrive · uploads paused", and one "Sign in" link.
- **Success:** offline is never mistaken for broken. Signed out gets fixed in one step.
- **Friction and fears:** offline shown with the same mark as a real error (the brief's rule currently does this); signed out shown as merely paused, so it's never fixed and nothing uploads for weeks.
- **Product insight:** these are **two different looks**. Offline = paused (muted, nothing to do). Signed out = problem (needs-me, one fix). `signInPending` (Keychain prompt) = paused too, with "Waiting for Keychain access" text. Signing out *on purpose* makes `connected` false, so the icon hides, which is right for a deliberate choice.

### D5 · The faint backed-up check on each session (#2, L8 F8)
- **The moment:** scanning the session list, or opening one session. Same as the earlier redesign research, D7.
- **The trigger:** "Is *this* call safe?" It's local and specific, while the icon is global.
- **Thoughts:** "Acme call: check. Today's call: no check yet… and the cloud is filling. Makes sense."
- **Emotions:** quiet confidence when the two agree, and suspicion when they don't.
- **Expectations:** the row check and the icon tell the same story. Icon idle ⇒ every row with a video has its check. A row without a check ⇒ the icon is moving, paused or needs-me. The popover can name the video that's still going, so they can match it to the row.
- **Success:** they never see the two disagree.
- **Friction and fears:** an icon at rest while a row has no check; the row check disappearing while the icon looks fine.
- **Product insight:** keep the row checks exactly as they are. They answer "this session", and the icon answers "everything". Build the icon's idle rule on the same safe set (`safeOnMac`, `inCloud`) as `isBackedUp()`, so they can't drift apart.

## Key insights

1. **Idle is a promise. Base it on safety, not on activity.** Idle = connected, signed in, and every video `safeOnMac`/`inCloud`. If anything else isn't safe and isn't a user problem, show the moving look (if bytes are going) or the paused look.
2. **Four looks, not three, behind the same `cloudState()` idea:** hidden · idle · moving (the ring fills) · paused (the ring holds its percent, muted: offline, Keychain, a server hiccup waiting on `retryAt`, sleep) · problem (the user must act). If the team wants to keep exactly 4 states, fold *paused* into *uploading* with a muted ring. It should still never fold into *problem*.
3. **Problem comes from states, not just from `lastError`.** Include `notUploadedUnreadable`, `notUploadedFull` and `missing` videos, plus `!signedIn && !signInPending`, `revoked` and `cloudFull`. Drop the bare `!online` and the transient `lastError`.
4. **The popover answers in this order:** (1) can I close the lid / is it safe, (2) videos and GB left, (3) a rough time left once it's steady, (4) the one problem and its one fix, (5) one Settings link. Reuse `problemNotice()` and the SPEC 6.2 lid sentence, and write no new copy for the same facts.
5. **ETA: coarse, steady, or absent.** Rounded words, only after ~10 s of steady data, never while paused. Speed is optional and goes after the time.
6. **The ring keeps its percent when paused and after waking.** It never jumps back to 0.
7. **Quiet when idle, and not red.** The icon is often in view during screen-shares. The needs-me mark should be small, use the accent colour and differ by shape too. *(Merlin's call on motion.)*

## Open questions (for the captain and Jony)

1. **Videos stranded after a disconnect.** When `connected` is false, the old banner said "N videos in OneDrive · connect to play them". With `hidden`, nothing says it. Is that fine because the row or player already says so, or should the icon still show in that case? *Assumption: hidden is fine, as long as the player says it when they try to play one.*
2. **`!online` and transient `lastError` as *problem*.** The brief says problem. This research says paused. I suggest changing `cloudState()` as in insights 2 and 3, but it's the captain's call.
3. **Does the engine emit `storage://changed` often enough during an upload** for the ETA to move? If not, the client needs a re-read every few seconds while uploading. Jony should check this in the build.
4. **`paused` while online and signed in:** when does that happen (a video in use, for example)? Until we know, treat it as *not safe*, so it's never idle.
5. **Hover tooltip:** a one-line summary on hover (for example "All 12 videos safe in OneDrive") costs little and covers behavior #10. Jony decides.
