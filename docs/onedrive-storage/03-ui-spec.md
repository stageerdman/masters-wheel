# OneDrive storage: UI spec

Author: Jony (UI Design) · 2026-11-25 · Builds on: `01-research.md` (Columbo), `02-magic.md` (Merlin) · Read by: Eraser (04 / SPEC), Uncle Bob (build)

Labels such as **#4**, **D6** and **W1** point to `01-research.md`. **M1–M5** are Merlin's Moments in `02-magic.md`.

---

## 0. The user goal, in one line

> "Keep my calls safe and my Mac light, without thinking about it."

Every screen below is judged by one test: **how little attention does it take?** Playing a video must feel the same in every mode (#1). People who never connect must see exactly today's app (#2).

## 1. Decisions (open questions answered)

| Question (01 / 02) | Decision | Why, in one line |
|---|---|---|
| Frame Drills takes in scope? | **No.** Only record videos (`hero.<ext>`). The Training Room gets no storage UI. | Keeps storage noise out of drills (D5). |
| Default mode | **Backup**, already selected the moment you connect. | It never removes anything, so a cautious first step is safe (D8). |
| When is the mode chosen? | **After** connecting, in the same panel. No step before sign-in. | Fewer steps. Backup starts at once, and switching to Smart is one click with a clear confirm. |
| Smart: does watching an old video bring it back? | **Yes.** It streams at once and downloads in the background, then stays on this Mac for 14 more days. | Matches "I watched it, so now it's here" (D7) and helps the next offline trip. |
| Always in cloud: does watching keep a copy? | **No.** It streams. The temporary buffer is cleared when you leave the video. | The mode promises a light Mac (W4). |
| Delete a video or record while connected | Removes it from this Mac **and from OneDrive**, and the confirm says so. | No silent leftovers filling the quota, and no surprises (W8). |
| Disconnect with videos only in OneDrive | They **download back to this Mac first**, then OneDrive disconnects. Copies already in OneDrive are left there. | The app never cuts off the last copy it can reach (W7). |
| Where is "all safe"? | **One status line** at the bottom of the video list, shown only when connected. | It sits where people look, right under the rows (M2, Q8). |
| Where is the offline banner? | **The same status line.** It is the only storage message outside Settings. | One place for every storage message, not a banner plus a line. |
| Where do storage actions live? | **Settings › Storage**, all of them. Per-video actions go in the row's right-click menu, which already exists. | One place per action (brief). |
| Quit with uploads pending | **No quit dialog.** The uploading status line says it continues after quitting (see 6.2). | A dialog on every quit is friction. The local copy is always kept until it's safe, so quitting can't lose anything. |
| Finder note (`Video is in OneDrive.webloc`) | **Kept.** | An empty record folder in Finder would look like a deleted call (W14, #18). |
| "Brought home" flip | **Kept, with no animation.** It follows from the Smart decision above. | The glyph changes because the place really changed. |
| One account per app or per Space? | **One for the whole app.** Mode is app-wide too. | Rare need, simpler mental model (01 scope). |

## 2. What I removed, and why

| Removed | Why |
|---|---|
| A mode picker before sign-in | It added a step before the user had anything to choose for. Backup is a safe default, and switching later is one click. |
| A separate "Try again" or "Try another account" button on connect errors | Both do the same thing as **Connect OneDrive**, and Microsoft's sign-in page already lets you pick another account. |
| A per-row "Sign in again" or "Manage storage" | These are account problems, not video problems. One fix lives in Settings. |
| An "Upload again" for videos missing in OneDrive that are still on this Mac | The app just uploads them again by itself. Nobody needs to press anything for that. |
| A quit dialog | See section 1. |
| Two glyphs per row (a safety mark plus a place mark) | **One glyph answers both questions.** Shapes are only used when they're true: a check means safe and on this Mac, and a cloud means safe and only in OneDrive. A cloud can never mean "not safe", because a copy only leaves the Mac after its receipt. |
| Row labels for calm states ("Safe") | A label repeated on 200 rows tells you nothing (D2). Calm states show only the glyph. Its full line is in the tooltip and the screen-reader label. |
| Download progress on rows (Smart bringing a video home, switching to Backup) | It's quiet background work. The status line shows the total. |
| Storage numbers when not connected | They don't help someone who isn't using the feature. |
| A Dock badge, notifications, sound, confetti | Already cut in 02 §5, and they stay cut. |

## 3. Vocabulary (use these words and no others)

- **on this Mac**: never "local", "device", "downloaded".
- **in OneDrive**: never "cloud" in text. The cloud *glyph* is fine.
- **safe**: only after OneDrive confirms the whole file (size or hash).
- **paused**: we wait and it continues by itself. Muted grey.
- **not uploaded**: the user needs to act. Accent colour.
- Never say **sync** or **synced** (W12).

Colour has two meanings only: `--color-text-muted` = nothing to do, `--color-accent` = you need to act. No new tokens. Shapes always carry the meaning too, so colour is never the only signal.

## 4. Where each action lives (one place each)

| Action | The only place |
|---|---|
| Connect OneDrive | Settings › Storage, the **Connect OneDrive** button |
| Choose a mode / switch modes | Settings › Storage, the **Keep videos** choice |
| Sign in again | Settings › Storage, the problem notice |
| Manage OneDrive storage (when it's full) | Settings › Storage, the problem notice |
| Show the folder in OneDrive | Settings › Storage, the account block |
| Disconnect | Settings › Storage, at the bottom |
| Retry a video that couldn't be read | The row's right-click menu, **Upload again** |
| Remove a video or record | The row's right-click menu (existing items, with new confirm copy) |
| Open the record folder | The row's right-click menu (existing item) |
| Get to Settings › Storage from the list | Clicking the status line. This is navigation, not a second copy of an action. |

The status line and the rows **only show state**. Neither one has its own buttons.

---

## 5. Settings › Storage

### 5.1 Entry

- The Settings icon rail gets a third option, **Storage**, after Profile and Score. It uses Phosphor `Cloud`, duotone, at the same size and in the same `radiogroup` as the existing rail. Tooltip and accessible label: "Storage".
- The panel uses the same content column, heading size and spacing as ProfilePanel and ScorePanel.
- This panel is **app-wide**, not per Space. Under the heading, in micro text: "For all Spaces."

### 5.2 Not connected (the default for every user)

Layout, top to bottom, left-aligned:

1. Heading: **Storage**
2. Micro, muted: For all Spaces.
3. Body: **Your videos are stored on this Mac.**
4. Body, muted: Connect OneDrive to keep a copy safe in the cloud, or to free up space on this Mac. Master's Wheel works fully without it.
5. Primary button: **Connect OneDrive**
6. Micro, muted, under the button: Works with personal and work Microsoft accounts. Only videos are uploaded. Notes, transcripts and scores stay on this Mac.

That's all. There are no modes, numbers or warnings. Nothing outside this panel changes: no row glyphs and no status line (D2).

### 5.3 Connect flow

**Step 1: click Connect OneDrive.** Microsoft's standard sign-in opens in the user's default browser. The button turns into a disabled button reading **Waiting for Microsoft sign-in…**, with a plain text button **Cancel** to its right. Line 6 stays.

**Step 2: the user signs in in the browser.** The browser page ends with Microsoft's normal "you can close this window" message, and Master's Wheel comes to the front by itself.

| Outcome | What the user sees | Focus goes to |
|---|---|---|
| **Success** | The Connected panel (5.4) with **Backup** selected and the one-time **First up** line. The status line appears under the video list, and uploads start at once, newest video first. | The panel heading |
| **Cancel** (Cancel clicked, or sign-in declined in the browser) | The not-connected panel again, with one muted line under the button: *Not connected. Your videos stay on this Mac, as before.* It clears the next time Connect is clicked. | Connect OneDrive |
| **Organization blocks it** (work account, #21) | Not-connected panel, accent line under the button: *Your organization doesn't allow Master's Wheel to use OneDrive. Ask your IT team, or connect with another account.* | Connect OneDrive (the same button starts a new sign-in, where Microsoft lets them pick another account) |
| **Offline when clicking** | The browser isn't opened. Muted line: *You're offline. Connect to the internet, then try again.* | Connect OneDrive |
| **Any other failure** | Accent line: *Couldn't connect to OneDrive. Please try again.* | Connect OneDrive |
| **User leaves Settings while waiting** | Sign-in still finishes. The status line appears under the list, which is the success signal there. | — |

There is no timeout. Waiting lasts until success or Cancel.

**Reconnecting to an account used before:** the app finds its existing folder and matches videos already there by record, so nothing uploads twice. Videos that were left only in OneDrive (see 5.7, "Disconnect anyway") can play again.

### 5.4 Connected

Layout, top to bottom:

1. Heading **Storage** · micro "For all Spaces."
2. **Account block**
   - Label: **OneDrive**
   - Body: Connected as **maria@acme.com**
   - Muted: Videos go to OneDrive › Apps › Master's Wheel · text button **Show in OneDrive** (opens that folder on OneDrive web)
3. **Problem notice** (only when one exists, see 5.6). It sits right here so it's the first thing read.
4. **First up line** (shown once after connecting, until the first queue is empty), body muted:
   *First up: 37 videos · 12.4 GB. Nothing leaves this Mac until it's safe in OneDrive.*
5. **Keep videos**: a single-choice list (a `radiogroup` with three large rows). Each row has a radio, the name in label size, the one line in body, and the hint in micro muted:

   | Name | Line | Hint |
   |---|---|---|
   | **Backup** · micro tag "Recommended" | Every video stays on this Mac, and a copy is kept safe in OneDrive. | For peace of mind. Doesn't free up space. |
   | **Smart** | Videos added or watched in the last 14 days stay on this Mac. Older ones live in OneDrive and play from there. | Frees space and keeps recent calls ready offline. |
   | **Always in cloud** | Videos live in OneDrive and play from there. This Mac keeps a copy only until it's safe. | Frees the most space. Needs internet to play. |

   The order runs from most on the Mac to least. Arrow keys move the selection, as in a native radio group. Selecting a row either applies at once or opens the switch confirm (5.5). It never applies silently when videos will move.
6. **Numbers line**, micro muted:
   - Backup: *On this Mac: 65.4 GB · In OneDrive: 65.4 GB*
   - Smart / Always in cloud: *On this Mac: 12.0 GB · In OneDrive: 53.4 GB · Freed 41.4 GB*. "Freed" shows only once it's above 0.
   - While a mode switch or disconnect is running, this line is replaced by its progress (5.5, 5.7).
7. **Disconnect OneDrive…**: a plain text button at the bottom, with space above it. It's never the primary button.

The panel has no primary button. In normal use there's nothing to do here, and that's the goal.

### 5.5 Switching modes (W9)

Rule: **a copy leaves this Mac only after its receipt. Downloads need room, and the app checks for room before it starts.**

| From → To | What happens | Confirm sheet (title · body · buttons) |
|---|---|---|
| Backup → Smart | Videos older than 14 days (not added or watched in that time) leave this Mac once safe. | **Switch to Smart?** · *142 older videos will move to OneDrive, freeing about 41 GB. Each one leaves this Mac only after it's safe in OneDrive.* · **[Switch to Smart]** [Cancel] |
| Backup → Always in cloud | Every video leaves this Mac once safe, except one being transcribed or played right now. | **Switch to Always in cloud?** · *All 182 videos will move to OneDrive, freeing about 53 GB. They'll need internet to play. Each one leaves this Mac only after it's safe in OneDrive.* · **[Switch to Always in cloud]** [Cancel] |
| Smart → Always in cloud | Recent videos still on this Mac leave once safe. | Same as above, using the count of videos still on this Mac. |
| Always in cloud → Smart | Videos from the last 14 days download back. | **Switch to Smart?** · *12 recent videos (4.1 GB) will download back to this Mac. You can keep working.* · **[Switch to Smart]** [Cancel] |
| Smart / Always in cloud → Backup | Every video only in OneDrive downloads back. | **Switch to Backup?** · *170 videos (49 GB) will download back to this Mac. You have 80 GB free. This may take a while. You can keep working.* · **[Switch to Backup]** [Cancel] |
| Any switch that downloads, not enough room | Nothing starts. | Same title · *170 videos (49 GB) need to download back to this Mac, but you have 30 GB free. Free up 19 GB first.* · [Switch] **disabled** · **[Cancel]** focused |
| Any switch where nothing moves (count = 0) | Applies at once, with no sheet. | — |
| Switching while offline | It applies at once and the moves wait for the internet. The sheet adds one line: *You're offline, so this starts when you're back.* | as above |

- In the sheet, Cancel has focus by default. Escape cancels. Cancel puts the radio back on the old mode.
- **While a switch runs**, the numbers line reads *Moving 142 videos to OneDrive · 38 left* or *Downloading 170 videos to this Mac · 31 GB left*, and the status line under the list says the same (6.2). Rows change glyph one by one as each video lands, with no motion.
- **Switching again mid-way** is allowed. The newest choice wins from that moment. Videos already moved stay moved, unless the new mode needs them back. Nothing is ever removed without a receipt.

### 5.6 Problem notice (account-wide problems, the one place to fix them)

A full-width block at position 3 of the Connected panel. It has a 2 px left rule in `--color-accent`, body text and one button. Only the highest-priority problem shows.

| Problem | Text | Button |
|---|---|---|
| **Signed out / token expired** (W6, #14) | **Signed out of OneDrive.** Uploads are paused, and 12 videos can't play until you sign in. | **Sign in again** (same browser flow as 5.3; on success the notice clears and uploads continue from where they paused) |
| Sign in again with a different account | **That's a different account.** Sign in as maria@acme.com, or disconnect first to use another account. | **Sign in again** |
| **OneDrive is full** (W5, #19) | **OneDrive is full.** New videos stay on this Mac until there's space, so nothing is lost. | **Manage storage** (opens Microsoft's storage page in the browser) |
| **Organization revoked access** | **Your organization no longer allows Master's Wheel to use OneDrive.** Your videos on this Mac are fine. | none. Disconnect stays available at the bottom. |

When there's room again or the account is back, the notice clears by itself and paused uploads continue. The app checks for space on open and whenever it's back online.

### 5.7 Disconnecting (W7, #24)

Click **Disconnect OneDrive…** and a sheet opens. Cancel has focus by default. The copy depends on where the videos are:

| Situation | Sheet body | Buttons |
|---|---|---|
| Every video is on this Mac (Backup, or nothing only in OneDrive) | **Disconnect OneDrive?** · *All your videos are on this Mac and stay there. The copies in OneDrive › Apps › Master's Wheel stay in OneDrive. Master's Wheel stops uploading.* | **[Disconnect]** [Cancel] |
| Some videos are only in OneDrive, with enough room | **Disconnect OneDrive?** · *142 videos are only in OneDrive (41 GB). They'll download back to this Mac first, then OneDrive disconnects. You have 80 GB free.* | **[Download and disconnect]** [Cancel] |
| Only in OneDrive, not enough room | *142 videos are only in OneDrive (41 GB), but you have 30 GB free. Free up 11 GB first, or stay connected.* | [Download and disconnect] **disabled** · **[Cancel]** |
| Only in OneDrive, but signed out or offline (nothing can download) | *142 videos are only in OneDrive and can't download right now (you're signed out / offline). If you disconnect anyway, they stay in OneDrive and won't play here until you connect again.* | **[Cancel]** · [Disconnect anyway] (plain text button, not primary) |

- **While downloading before disconnect:** the numbers line reads *Disconnecting · downloading 142 videos · 31 GB left*. The Disconnect button becomes **Stop disconnecting**, which keeps the account connected in its current mode. Uploads and offloading are paused during this time.
- **When it finishes:** the panel goes back to Not connected (5.2). The status line and every row glyph disappear. Sign-in tokens are deleted. Nothing in OneDrive is deleted.
- **After "Disconnect anyway":** the panel is Not connected. Only the stranded videos keep a glyph (6.1, "In OneDrive, not connected"). When the user connects again with the same account, they play again.

---

## 6. The video list

### 6.1 Per-video status glyph

**Where:** the right edge of each `VideoListItem` row, vertically centred, 14 px, in a fixed slot so titles never shift. Calm states use `--color-text-muted`. Uploading uses `--color-text`. Problems use `--color-accent`. The existing call-state glyph on the left doesn't change.

**Short label:** non-calm states add a short label to the row's existing date line, after a middle dot: *12 Nov · Uploading 42%*. Calm states have no label.

**Full line:** the glyph's tooltip, which is also its `aria-label` and part of the row's accessible name. The row's own `title` (description) stays as it is.

**When not connected:** there's no glyph slot at all. The row is exactly as it is today.

| State | Glyph | Short label (date line) | Full line (tooltip / screen reader) | Row clickable? Plays? |
|---|---|---|---|---|
| Waiting to upload | empty ring, muted | Waiting to upload | On this Mac. It will upload to OneDrive soon. | Yes · plays from this Mac |
| Uploading | ring filling with %, text colour | Uploading 42% | On this Mac, uploading to OneDrive (42%). You can keep working or play it. | Yes · plays from this Mac |
| Checking | full ring, no check yet | Checking… | Upload finished. Checking that OneDrive has the whole file. | Yes · plays from this Mac |
| Paused (offline, sleep, quit, signed out) | ring at its exact %, muted | Paused | Upload paused at 42%. It continues on its own when you're online. *(Signed out:* …when you sign in again.*)* | Yes · plays from this Mac |
| **Safe, on this Mac** | check, muted | *(none)* | Safe in OneDrive, and on this Mac. Plays without internet. *(Smart adds:* On this Mac until 9 Dec.*)* | Yes · plays from this Mac |
| **Safe, only in OneDrive** | cloud, muted | *(none)* | Safe in OneDrive. Plays from there (needs internet). | Yes · streams |
| Only in OneDrive, offline | cloud, muted; **title and date muted** | Needs internet | Safe in OneDrive, but it needs internet to play. | Yes, it opens the record (notes, transcript and score are on this Mac) · player shows the 6.4 message |
| Only in OneDrive, signed out | cloud, muted; title and date muted | Needs sign-in | Safe in OneDrive. Sign in again in Settings › Storage to play it. | Yes · player shows the 6.4 message |
| Not uploaded: OneDrive full | dot, accent | Not uploaded | Not uploaded: OneDrive is full. It's still on this Mac. | Yes · plays from this Mac |
| Not uploaded: file can't be read | dot, accent | Not uploaded | Not uploaded: this file couldn't be read. It's still on this Mac. Right-click and choose Upload again. | Yes |
| Missing in OneDrive, not on this Mac (W2) | dot, accent; title and date muted | Missing in OneDrive | We can't find this video in OneDrive. It may have been deleted there. | Yes · player shows the 6.4 message |
| In OneDrive, not connected (after "Disconnect anyway") | cloud, muted; title and date muted | In OneDrive | This video is in OneDrive. Connect OneDrive in Settings › Storage to play it. | Yes · player shows the 6.4 message |

Rules:
- **Missing in OneDrive but still on this Mac:** there's no special state. The app uploads it again by itself, so the row goes back to Waiting, Uploading and then Safe.
- **New videos** always start as *Waiting to upload* **on this Mac**, fully playable and transcribable (D3). In Always in cloud, the copy on this Mac stays until it is safe **and** its transcription has finished.
- **Smart bringing a video home:** it stays a cloud glyph while it downloads, then changes to a check when the download is complete. No progress is shown on the row.
- **Upload progress and transcription progress never share a row.** Transcription progress stays where it is today (TranscriptionProgress in the detail pane). The row only ever shows the ring.
- Short network or server errors are **Paused** with automatic retries, never "Not uploaded". "Not uploaded" means the user has something to do, or the app is waiting for space.

**Motion (M1, M3):** the ring's stroke grows with progress. When the receipt lands, the full ring becomes a check with one 150 ms scale from 0.9 to 1, with no bounce and no colour flash. Every other glyph change is an instant swap, including Mac to cloud (offloading happens when nobody is watching). With `prefers-reduced-motion`, the ring updates in 10% steps and the check swaps in with no scale. The check is driven by the real confirmation, never by a timer.

### 6.2 The status line (the only storage message outside Settings)

**Where:** pinned to the bottom of the video list (Navigation), under the scrolling list, full width. It uses label-size text on one line and shows an ellipsis if too long, with the full text in the tooltip. A hairline `--color-border` rule sits above it. It **only exists while connected**, or while stranded videos exist after "Disconnect anyway".

**What it does:** it's a single button whose only effect is to open **Settings › Storage**. It carries no other action. Its accessible name is the text followed by ", open storage settings". It's a polite live region, so changes are announced without stealing focus.

It shows **one state at a time**, picking the highest priority first:

| Priority | State | Text | Colour |
|---|---|---|---|
| 1 | Signed out | **Signed out of OneDrive** · uploads paused | accent |
| 2 | OneDrive full | **OneDrive is full** · 3 videos waiting on this Mac | accent |
| 3 | Offline (no network, or OneDrive unreachable), something only in OneDrive | **Offline** · 12 videos need internet to play | muted |
| 3 | Offline, nothing only in OneDrive | **Offline** · uploads continue when you're back | muted |
| 4 | A video couldn't be read | 1 video not uploaded | accent |
| 5 | Disconnecting | Disconnecting · 31 GB left to download | muted |
| 5 | Mode switch running | Moving 142 videos to OneDrive · 38 left / Downloading 170 videos to this Mac · 31 GB left | muted |
| 6 | Uploading | 3 uploading · 1.2 GB left | text |
| 7 | Just reopened and uploads finished while away | 2 uploads finished since you last looked | muted, shown until the next state change or 10 s, then 8 |
| 8 | Everything safe | All 214 videos safe in OneDrive | muted |
| 8 | Connected, no videos yet | OneDrive connected · new videos go there | muted |
| — | In OneDrive, not connected (stranded) | 4 videos in OneDrive · connect to play them | muted |

- The **uploading** tooltip answers the "can I close the lid?" question (D6): *Uploads continue on their own, even if you quit or close the lid. Nothing leaves this Mac until it's safe.*
- The text swaps with a 200 ms crossfade, or instantly with reduced motion.
- "Offline" is muted (you wait). "Signed out" is accent (you act). They never look alike (W6).
- When the user comes back online, the line moves to the next state by itself. Nothing needs dismissing.

### 6.3 Right-click menu additions (rows only)

Existing items stay: **Open folder in Finder**, **Remove video**, **Remove record**. One item is added:

- **Upload again**: shown only on a row in *Not uploaded: file can't be read*. It puts the video back in the queue.

**Remove confirms** (they already exist; this adds copy when connected, W8):
- Remove video: *Remove the video from "Acme discovery call"? This removes it from this Mac **and from OneDrive**. Notes and transcript stay.*
- Remove record: *Remove "Acme discovery call"? This removes it from this Mac **and its video from OneDrive**.*
- If offline or signed out, add: *It's removed from OneDrive when you're next online.*
- When not connected, the copy stays exactly as it is today.

### 6.4 The player (MediaPlayer)

- **Playing from this Mac:** no change at all.
- **Streaming (a video only in OneDrive):** the same player and controls. A micro muted label, **Playing from OneDrive**, sits at the player's bottom-left, under the controls row. If buffering lasts over about 1 s (on start or after a seek), the label reads **Loading from OneDrive…** until playback resumes. There's never a spinner without words, and never a "download first" step. Transcript timestamps and scrubbing seek in the stream (#8).
- **Can't play here**: the video area shows one centred body-text line in place of the video. There's no broken player and no error icon. The rest of the record (notes, transcript, scorecard) works normally:
  - Offline: *This video is in OneDrive. Connect to the internet to play it.*
  - Signed out: *This video is in OneDrive. Sign in again in Settings › Storage to play it.*
  - Missing: *We can't find this video in OneDrive. It may have been deleted there.*
  - Stranded after disconnect: *This video is in OneDrive. Connect OneDrive in Settings › Storage to play it.*
- **Re-transcribe a video only in OneDrive** (W13, #16): the existing TranscriptionProgress shows **Fetching from OneDrive…** first, then the normal transcribing steps. The fetched copy is temporary and removed afterwards in Always in cloud. In Smart it counts as "watched" and stays for 14 days. Offline or signed out: re-transcribe is disabled, with a tooltip using the matching line above.

---

## 7. Offline behavior (all of it in one place)

- **What counts as offline:** no network, or OneDrive unreachable. Signed out is **not** offline. It has its own state everywhere.
- **The banner** is the status line (6.2, priority 3). There's no second banner.
- **Before the click (W3):** rows only in OneDrive dim their title and date and read *Needs internet*. Rows with a copy on this Mac look normal. Clicking a dimmed row still opens the record.
- **Queued uploads:** videos added offline start as *Waiting to upload*. Interrupted ones show *Paused* at their exact %. Both continue from where they stopped once the app is online, **including after a quit or restart**. They never start again from 0% and never show "failed".
- **When copies on this Mac are kept:**
  1. A copy leaves this Mac **only** after its receipt (size or hash confirmed).
  2. **No copy leaves this Mac while offline**, even if Smart's 14 days pass in the middle of a flight. Offloading waits until the app is online.
  3. A copy never leaves while it's playing or being transcribed.
  4. If OneDrive is full or the user is signed out, every copy waiting to upload stays on this Mac.
- **Mode switch or disconnect while offline:** see 5.5 and 5.7.

## 8. Finder

- When a video leaves this Mac, a small file named `Video is in OneDrive.webloc` is written into its record folder. It opens that video on OneDrive web. It's removed when the video comes back.
- The app must ignore this file when it looks for `hero.<ext>`.
- In OneDrive, files are tracked by their OneDrive item, not by their path, so renaming or moving them inside OneDrive doesn't break playback (W11). If they're deleted there, the row shows *Missing in OneDrive* (or is quietly uploaded again if it's still on this Mac).

## 9. Accessibility

- All text uses the existing four sizes and the core palette. Muted text must meet 4.5:1 on the surface. Dimmed rows keep the muted token. They don't use opacity.
- Glyphs differ by **shape** (empty ring, filling ring, full ring, check, cloud, dot), not by colour alone.
- Every glyph has an `aria-label` with its full line. The status line is a button and a polite live region.
- Mode choice is a `radiogroup` with arrow-key movement. Confirm sheets trap focus, with Cancel focused by default, Escape cancelling, and focus returning to the control that opened them.
- Tap and click targets are at least 24 px (the status line and text buttons included). The 14 px glyph doesn't need to be a target, because it has no action.
- Reduced motion: the ring moves in steps, and every swap is instant.

## 10. State checklist (every state has a look, a label and an action)

| # | State | Look | Label | Action |
|---|---|---|---|---|
| 1 | Not connected | 5.2 panel, no list UI | Your videos are stored on this Mac. | Connect OneDrive |
| 2 | Waiting for sign-in | disabled button | Waiting for Microsoft sign-in… | Cancel |
| 3 | Sign-in cancelled | 5.2 + muted line | Not connected. Your videos stay on this Mac, as before. | Connect OneDrive |
| 4 | Org blocked at connect | 5.2 + accent line | Your organization doesn't allow… | Connect OneDrive |
| 5 | Offline at connect | 5.2 + muted line | You're offline… | Connect OneDrive |
| 6 | Connect failed | 5.2 + accent line | Couldn't connect to OneDrive… | Connect OneDrive |
| 7 | Connected, first queue | 5.4 + First up line | First up: 37 videos… | none needed |
| 8 | Connected, steady | 5.4 | Connected as … | none needed (mode / Disconnect available) |
| 9 | Switch confirm | sheet | 5.5 copy | Switch / Cancel |
| 10 | Switch blocked (no room) | sheet, Switch disabled | …Free up N GB first. | Cancel |
| 11 | Switch running | numbers line + status line | Moving… / Downloading… | none (switch again allowed) |
| 12 | Signed out | notice + accent status line + dimmed cloud rows | Signed out of OneDrive | Sign in again |
| 13 | Wrong account on re-sign-in | notice | That's a different account… | Sign in again |
| 14 | OneDrive full | notice + accent status line + "Not uploaded" rows | OneDrive is full | Manage storage |
| 15 | Org revoked | notice | …no longer allows… | Disconnect (bottom) |
| 16 | Offline | muted status line + dimmed cloud rows | Offline · … | none (clears by itself) |
| 17 | Row: waiting / uploading / checking / paused | rings | 6.1 | none (plays) |
| 18 | Row: safe on this Mac / only in OneDrive | check / cloud | tooltip only | plays / streams |
| 19 | Row: needs internet / needs sign-in | dimmed cloud | Needs internet / Needs sign-in | opens record; sign in via Settings |
| 20 | Row: not uploaded (full / unreadable) | accent dot | Not uploaded | Manage storage (Settings) / Upload again (menu) |
| 21 | Row: missing in OneDrive | accent dot, dimmed | Missing in OneDrive | Remove video (menu) |
| 22 | Row: stranded after disconnect | dimmed cloud | In OneDrive | Connect OneDrive (Settings) |
| 23 | Player: streaming / buffering | micro label | Playing from OneDrive / Loading from OneDrive… | none |
| 24 | Player: can't play | centred line | 6.4 copy | as stated in the line |
| 25 | Re-transcribe, video only in OneDrive | TranscriptionProgress | Fetching from OneDrive… | none |
| 26 | Remove confirm, connected | existing confirm | …and from OneDrive. | Remove / Cancel |
| 27 | Disconnect confirm (4 variants) | sheet | 5.7 copy | Disconnect / Download and disconnect / Disconnect anyway / Cancel |
| 28 | Disconnecting | numbers line + status line | Disconnecting · … left | Stop disconnecting |
| 29 | All safe | status line | All 214 videos safe in OneDrive | opens Settings |
| 30 | Finished while away | status line, once | 2 uploads finished since you last looked | opens Settings |

## 11. Assumptions and quick checks

- *Guess:* the browser hand-off for Microsoft sign-in (system browser plus a loopback redirect) feels fine to users. **Check:** time five sign-ins, personal and work. The target is under a minute, back in the app on its own.
- *Guess:* a status line pinned under the list is noticed by careful keepers. **Check:** ask three users "is your last call backed up?" and watch where they look.
- *Guess:* one glyph (check or cloud) answers both "is it safe?" and "can I play it offline?". **Check:** show the two glyphs without tooltips and ask what each means.
- *Guess:* the 4.5:1 muted contrast holds on the current `--color-surface`. Uncle Bob should verify it with the real tokens.
- Example numbers, names and dates are placeholders.
