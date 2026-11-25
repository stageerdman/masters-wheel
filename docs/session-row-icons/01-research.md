# Session row icons: how people read storage and Reviewed marks

Researcher: Columbo (Magic UX) · 2026-11-25
Feeds: `00-roadmap.md` → Jony (`03-ui-spec.md`, build) → Eraser (`04-cleanup-review.md`).

## Summary

People scan a list of sessions for two things: **"is this call safe, and where does it live?"** and **"have I dealt with this one already?"** Today's row answers both badly:

- The storage mark is a `✓` that only means "in OneDrive". It doesn't say whether the video is still on this Mac, so "plays from the cloud" and "on both" look the same.
- The Reviewed mark is a bare `•`. In Mail, Slack, Messages and most inboxes, a dot means **unread or new**, which is the opposite of what we mean.
- The header's Reviewed toggle is also a `✓` (`ActionIsland.tsx`). So the row's `✓` (backed up) is easy to read as "reviewed", and the `•` (reviewed) as "not looked at yet". **Both row marks invite the wrong reading.**

What users already know from OneDrive, iCloud Drive, Dropbox and Google Drive: a **cloud shape** means "lives online, not on this device". A **check** means "on this device / done". A **red or alert mark** means "something's wrong". Arrows or a ring mean "moving". Our row should borrow the *shapes* people know (cloud, device, arrow, alert). It should **not** use a check for storage. In our app, the check already means Reviewed.

The raw data has a real stuck state (`notUploadedFull`, `notUploadedUnreadable`, `missing`), so the row needs five visible storage cases plus "unknown yet", and one Reviewed mark. That's at most two marks per row.

## Scope

**In (this item):**
- The storage mark on each Performance Review session row: cloud only, cloud + this Mac, this Mac only, uploading, stuck.
- The Reviewed mark on each row.
- Tooltips and screen-reader labels in words.
- How the row's marks relate to the header's cloud status icon and popover (say each fact once).

**Out (and why):**
- Changing the storage engine or `StorageOverview` (Rust). The data we need is already there.
- The header Reviewed toggle (`ActionIsland`). Another element; we only make the row *agree* with its check.
- The Training Room, Settings › Storage, notifications. Not the row.
- Per-row actions (Retry, "Free up space", "Download"). The fix already lives in one place, the cloud popover. A second path breaks our rule "one place per action".
- Showing upload percent on the row. The popover already shows progress. Repeating it on every row is noise.

## What the data really says

From `src/lib/onedrive/storage.ts` (`VideoStatus.state`) and `src-tauri/src/storage/status.rs` (`video_status`):

| Raw state | What it truly means | Row case |
|---|---|---|
| `inCloud` | Safe in OneDrive; the local copy was removed. Plays from OneDrive (needs internet). | **cloud only** |
| `safeOnMac` | Safe in OneDrive **and** still on this Mac. | **cloud + this Mac** |
| `waiting`, `uploading`, `checking` | On its way. Queued, sending, or OneDrive confirming. | **uploading** |
| `paused` | On its way, but not moving: offline, signed out or revoked. The engine resumes by itself. | **uploading** (the popover says why it's paused) |
| `notUploadedFull` | Can't upload: OneDrive is full. Waits for the user. | **stuck** |
| `notUploadedUnreadable` | Can't upload: the file can't be read. Waits for the user. | **stuck** |
| `missing` | Not on this Mac, and OneDrive no longer has it. The video may be gone. | **stuck** |
| no `VideoStatus` for this record, while connected | Not picked up by the engine (yet). | **this Mac only** |
| `connected: false` | OneDrive not connected. | **this Mac only** |
| overview is `null` (not read yet) | We don't know yet. | **unknown: draw nothing** |

Notes:
- `lastError` + `retryAt` on a moving video means one try failed and the engine **retries by itself**. That is *not* stuck. The popover already lists it as "retrying in a moment". The row stays "uploading". Showing an alert for a self-healing hiccup would scare people for nothing.
- `CloudStatus.script.ts` already defines the same stuck list (`STUCK`) and `isMoving()`. The row must use the exact same grouping, or the row and the popover will disagree about the same video.

## How similar apps do it (what users bring with them)

| App | Online only | On device too | Moving | Broken |
|---|---|---|---|---|
| OneDrive | Blue **cloud** outline | Green **check** (downloaded) / solid green check ("always keep") | Circular **arrows** | Red circle with **✕** |
| Dropbox | **Cloud** outline | Green circle **check** | Blue circular **arrows** | Red circle with **✕** |
| iCloud Drive (Finder) | **Cloud with down arrow** (tap to download) | No icon | Cloud / pie progress (forum reports; not documented) | Exclamation in some versions (assumption) |
| Google Drive for desktop | **Cloud** | **Check** ("available offline") | Arrows | Alert |

What carries over:
1. **Cloud = "not on this device".** All four agree. It is the strongest shared meaning we have.
2. **No icon = "normal, on this device"** in iCloud. People don't miss a mark for the plain case. But in our app the plain case is "only on this Mac, not safe yet", which is *not* safe. So it deserves a quiet mark (see deep dive 3).
3. **Check = "on device / done".** In our app the check already means Reviewed (header toggle). Using it for storage too is the clash we have today. Storage uses shapes (cloud, device), never a check.
4. **The two states people mix up most are "online only" and "on both".** OneDrive users often ask what the green check vs the solid green circle means, and whether a file will open offline (Microsoft Q&A threads below). Our "cloud only" vs "cloud + this Mac" must differ in **shape**, not just colour or fill.
5. **Red ✕ / alert = act now.** Universal. Use it only for states that won't fix themselves.

## How people read "Reviewed" on a call recording

Who uses this: a salesperson or coach who records calls, opens each one, looks at the scorecard, and ticks "Mark as personally reviewed" in the header.

What "Reviewed" could mean to them (assumptions, from inbox, video and call-coaching habits):
- **"I've watched it and dealt with it."** The most likely reading, and what the data means (`reviewed` = "the user has personally reviewed/analyzed this call").
- **"The AI has reviewed it."** A real risk: the app makes scorecards. A user may think the mark appears once a scorecard is generated. The tooltip must say *you*.
- **"Someone else (my manager) reviewed it."** Lower risk in a single-user Mac app, but "you" in the tooltip settles it.
- **"Watched to the end."** The app doesn't know that. The mark is a manual tick. A tooltip that claims "you've watched" says more than the app knows. Safer: "you marked this call as reviewed".

Visual habits people bring:
- **Dot = unread/new** (Mail, Slack, Messages, podcast apps). A dot for "done" reads backwards.
- **Check = done / seen** (to-do apps, message read receipts, Netflix/YouTube "watched" ticks). Matches our header toggle.
- **Filled vs outline** is weak at row size. Shape matters more than fill.

## Behavior table

Scores 1–10. Sorted by combined score. When unsure, I picked the lower score.

| # | Behavior | Likelihood | Frequency | Reason |
|---|---|---|---|---|
| 1 | **Scan for what's left to review**: run down the list for rows without a Reviewed mark | 9 | 9 | The daily job of the app: "which calls haven't I dealt with?" Happens on almost every open. |
| 2 | **Glance-check a call is safe** before closing the laptop or after a recording | 8 | 8 | The OneDrive feature exists for this. People want to know nothing will be lost, without opening anything. |
| 3 | **Hover a mark to learn what it means** (first weeks, or after an icon changes) | 8 | 7 | New icons always get hovered. It drops off once learned, so frequency is lower. |
| 4 | **Ask "will this play right now?"** before opening a call on the train, plane or bad Wi-Fi | 7 | 7 | Cloud-only videos need internet. People hit this when travelling or on hotel Wi-Fi. |
| 5 | **Watch a fresh recording go from uploading to safe** | 7 | 7 | Right after a call, people check that the new one is "getting there". |
| 6 | **Spot the one row that's stuck** | 7 | 4 | Rare (OneDrive full, unreadable file, missing), but when it happens it must jump out. |
| 7 | **Work out why the Mac disk is full** by looking for rows that are still on this Mac | 5 | 3 | Power users in Smart mode. The popover and Settings serve this better. |
| 8 | **Read a ✓ as "reviewed"** and skip a call that wasn't reviewed (misreading) | 6 | 6 | Happens today because both marks look "done". Goes away if storage never uses a check. |
| 9 | **Read a dot as "new / unread"** and reopen calls already reviewed (misreading) | 6 | 6 | Today's `•`. Goes away with a real Reviewed icon. |
| 10 | **Expect Reviewed to appear by itself** after a scorecard is generated | 5 | 4 | The app makes AI scorecards. Some users will assume "reviewed" is automatic. |
| 11 | **Screen reader user** moves through rows and hears each state | 3 | 6 | Few users, but every row every time. The labels must be words, never glyph names. |
| 12 | **Click the storage icon** expecting an action (download, retry) | 4 | 3 | Common habit from Finder/iCloud ("tap cloud to download"). Out of scope: the row opens the call. |

**Watch out** (low score, high cost):
- **"Safe" shown too early.** If "uploading" or "checking" ever draws the cloud + Mac icon, a user may delete the local file or close the lid and lose the call. Breaks trust for good.
- **`missing` hidden as "cloud only".** The video may be gone; drawing a calm cloud would lie.
- **Row and popover disagree** about the same video (e.g. the row says stuck, the popover says retrying). Use the same grouping.
- **Every row flashes "Only on this Mac"** for a second while the overview loads, then flips. Looks like data loss. Hence "unknown: draw nothing".
- **Colour-only differences.** About 1 in 12 men has red-green colour blindness. Each state must differ by shape.

## Deep dives

### 1. Scan for what's left to review (9 / 9)
- **The moment:** Morning, at the desk, coffee in hand, Mac open. They just finished yesterday's calls or are planning today's coaching.
- **The trigger:** "I have 20 minutes, which calls haven't I gone through?"
- **Thoughts:** "Done, done, not done… that one, open it." "Wait, does the tick mean I looked at it, or that it's uploaded?"
- **Emotions:** Before: slightly behind, wants control. During: brisk, scanning. After: relief when the unreviewed ones stand out.
- **Expectations:** One look down the right edge of the list. Reviewed rows look "closed". Unreviewed rows are simply missing that mark. Zero clicks.
- **Success:** "I can see at a glance which three are left."
- **Friction and fears:** Two look-alike marks (today's ✓ and •). A dot that reads as "new". A Reviewed mark that sits in a different spot on some rows (columns jump when one mark is missing).
- **Product insight:** The Reviewed mark must be the same *kind* of sign as the header toggle (a check). It sits in a **fixed slot**, so its presence or absence reads as a column. It is the louder of the two marks, because it serves the more frequent job. Tooltip says "you", never "watched".

### 2. Glance-check a call is safe (8 / 8)
- **The moment:** Late afternoon, right after a client call, or before shutting the lid to go home.
- **The trigger:** "Is today's recording backed up? Can I close this?"
- **Thoughts:** "Is it in OneDrive yet? What does that icon mean, is that good?"
- **Emotions:** Before: low-level worry (recordings are evidence of work, sometimes irreplaceable). After: calm if it's clearly safe, anxious if it's unclear.
- **Expectations:** The newest row's icon answers "safe or not" in under a second. "Safe" looks clearly different from "on its way" and "only here".
- **Success:** "Cloud on it, good, I can go."
- **Friction and fears:** A safe-looking icon while still checking. "Uploading" and "safe" icons that look alike. Having to open the popover just to learn one row's state.
- **Product insight:** Both safe states (`cloud_only`, `cloud_and_local`) include the **cloud shape**. The two not-safe states (`local_only`, `uploading`) don't draw a plain cloud: local_only has no cloud at all, uploading has the cloud with an up arrow. The safe icon only appears once the raw state is `safeOnMac` or `inCloud`, never during `checking`.

### 3. Hover a mark to learn what it means (8 / 7)
- **The moment:** First days after the update, any time.
- **The trigger:** "That's a new icon. What is it?"
- **Thoughts:** "Laptop with… what? Is that bad?"
- **Emotions:** Curious, slightly wary. Pleased if the tooltip answers in plain words.
- **Expectations:** The native tooltip after a short hover. One short sentence: where the video is, plus what that means for them ("Plays from the cloud").
- **Success:** One hover is enough; they never need to hover that icon again.
- **Friction and fears:** Jargon ("offloaded", "synced", "safeOnMac"). A tooltip that names the icon but not the consequence. No tooltip on the Reviewed mark.
- **Product insight:** Every mark has `title` **and** `aria-label` with the same plain sentence. Each label says *where* it is and, if it matters, *what that means*. "This Mac only" also needs to be a quiet mark, not nothing, because here the plain case is the risky one.

### 4. "Will this play right now?" (7 / 7)
- **The moment:** On a train or plane, hotel Wi-Fi, laptop on battery. They want to rewatch a call before a meeting.
- **The trigger:** "I need to check what the client said."
- **Thoughts:** "Is this one on the laptop or only in the cloud? I've got no signal."
- **Emotions:** Time pressure, mild stress. Frustration if a call won't load with no warning.
- **Expectations:** The row tells "needs internet" apart from "on this Mac" before they click.
- **Success:** "Cloud only, so I'll pick the one that's on the Mac, or wait for Wi-Fi."
- **Friction and fears:** "Cloud only" and "on both" that differ only by a small fill. Not knowing until the player spins.
- **Product insight:** "Cloud only" = **cloud alone**. "On both" = **cloud plus device**. "This Mac only" = **device alone**. One family where the parts add up, so people can read it without learning it: cloud means OneDrive, the device means this Mac.

### 5. Watch a fresh recording go from uploading to safe (7 / 7)
- **The moment:** Minutes after a recording lands, the list is open.
- **The trigger:** The new row appears with an "uploading" mark.
- **Thoughts:** "It's going up… done?"
- **Emotions:** Mild anticipation, then a small "good" when it turns safe.
- **Expectations:** The mark changes by itself when it's done, quietly, with no reload. No spinner on every row.
- **Success:** The icon settles from "uploading" to "safe" with the existing settle animation, once.
- **Friction and fears:** A busy animated icon on every row during a big first upload (20 rows spinning). Rows all fading in at once when the app opens.
- **Product insight:** The uploading icon is **static** (cloud + up arrow). Motion lives in the header ring. Keep today's settle, and fire it only when a row goes from `uploading` to a safe state live, not from `unknown`. Paused videos keep the uploading icon; the header popover already explains the pause.

### 6. Spot the one row that's stuck (7 / 4; kept because the stakes are high)
- **The moment:** Any time; often noticed days later.
- **The trigger:** The header cloud shows a problem, or they just scan the list.
- **Thoughts:** "Which one is it? Is my call lost?"
- **Emotions:** A jolt of worry. It turns into calm only if the fix is obvious.
- **Expectations:** The broken row looks different from all others by **shape**. The tooltip says what's wrong in a few words and where to fix it.
- **Success:** "That one. The tooltip says open the cloud icon, there's the reason and Retry."
- **Friction and fears:** An alarming red on a self-healing retry. A stuck row that looks like "uploading" forever. A fix button on the row *and* in the popover (which one?).
- **Product insight:** Add a **stuck** case, only for `notUploadedFull`, `notUploadedUnreadable` and `missing` (the same list as `STUCK` in `CloudStatus.script.ts`). Cloud with an alert mark, in the warning colour, never the only cue. The tooltip points to the one fix place: the cloud icon at the top. Transient `lastError` stays "uploading".

## Key insights

1. **Never use a check for storage.** In this app the check means Reviewed (header toggle). That clash is today's biggest misreading.
2. **Never use a dot for Reviewed.** A dot means unread or new. Use a check-in-circle that matches the header toggle.
3. **One shape family for storage**: cloud = OneDrive, device = this Mac, combine them for both, add an up arrow for uploading and an alert for stuck. Readable without learning.
4. **Shape first, colour second.** Each state must be clear in greyscale.
5. **At most two marks, in fixed slots**: storage, then Reviewed (or the order Jony picks). Keep it the same on every row, so the marks read as columns.
6. **Say each fact once.** The row tells *this* video's state. Progress, ETA, reasons and Retry stay in the header popover. The stuck tooltip points there.
7. **Don't draw a guess.** While the overview loads, draw no storage mark; never flash "only on this Mac".
8. **Honest Reviewed wording**: "you marked it", not "you watched it", so nobody thinks it's automatic.

## Open questions (with the assumption I made)

- **OneDrive not connected → "this Mac only" on every row?** The brief says yes, and I keep it: for someone who never connected, the quiet device icon is the honest "not backed up" fact. *Risk:* the same icon on every row is noise. Eraser should judge this at Start. If it reads as clutter, the fallback is to draw nothing when `connected` is false, because the header already says it.
- **Paused shown as "uploading".** Assumption: "on its way" is true, and the popover explains why. If testers read the up arrow as "moving right now", consider the label "Waiting to upload to OneDrive" for paused.
- **Click on a storage icon** does nothing special (the row opens the call). Some users may expect download/retry like Finder. Not in this item.

## Sources

- Microsoft: [What do the OneDrive icons mean?](https://support.microsoft.com/en-us/onedrive/what-do-the-onedrive-icons-mean)
- Microsoft Q&A: [Files On-Demand status on OneDrive for Mac is confusing](https://learn.microsoft.com/en-us/answers/questions/5789721/files-on-demand-status-on-onedrive-for-mac-is-conf)
- Microsoft Tech Community: [Green tick vs solid green circle](https://techcommunity.microsoft.com/t5/sharepoint/what-are-the-differences-between-quot-green-tick-icons-quot-amp/m-p/1988169)
- Dropbox: [Sync icons on macOS](https://help.dropbox.com/sync/macos-sync-icons), [Sync icons on Windows](https://help.dropbox.com/sync/sync-icons-windows)
- Apple Community: [Cloud with a down arrow in iCloud Drive](https://discussions.apple.com/thread/6686302), [What do the iCloud icons mean](https://discussions.apple.com/thread/254892631)
- Code: `src/lib/onedrive/storage.ts`, `src-tauri/src/storage/status.rs`, `src/elements/PerformanceReview/children/CloudStatus/CloudStatus.script.ts`, `src/elements/AppHeader/children/ActionIsland/ActionIsland.tsx`, `src/elements/PerformanceReview/PerformanceReview.backup.ts`, `src/elements/PerformanceReview/children/Navigation/children/VideoListItem/VideoListItem.tsx`
