# OneDrive storage: build spec

Status: **Final, signed off by Eraser** · 2026-11-25 · For: Uncle Bob (build)
Sources: `01-research.md` (Columbo), `02-magic.md` (Merlin), `03-ui-spec.md` (Jony), `04-cleanup-review.md` (Eraser). **This file wins** wherever they differ.

Labels such as **#4**, **D6** and **W1** point to `01-research.md`, if you want the reason behind a rule. You don't need them to build.

---

## 0. The goal

> "Keep my calls safe and my Mac light, without thinking about it."

- Playing a video feels the same in every mode (#1).
- People who never connect see exactly today's app (#2).
- **A copy leaves this Mac only after OneDrive confirms the whole file.** This rule beats every other rule (W1).

## 1. Decisions

| Question | Decision |
|---|---|
| What gets stored | Record videos only (`hero.<ext>`). No Frame Drills takes, notes, transcripts or scores. The Training Room gets no storage UI. |
| Accounts | One Microsoft account (personal or work) for the whole app. Mode is app-wide too. |
| OneDrive folder | `OneDrive › Apps › Master's Wheel`, keeping the Space / record structure inside. |
| Default mode | **Backup**, already selected the moment you connect. No mode step before sign-in. |
| Smart: watching an old video | Streams at once, downloads in the background, then stays on this Mac for 14 more days. Only if there's room (§7 rule 5). |
| Always in cloud: watching | Streams. The temporary buffer is cleared when you leave the video. |
| Remove a video or record while connected | Removed from this Mac **and** from OneDrive (normal OneDrive delete, so it goes to OneDrive's recycle bin). The confirm says so. |
| Disconnect with videos only in OneDrive | They download back to this Mac first, then OneDrive disconnects. Nothing in OneDrive is deleted. |
| Quit with uploads pending | No quit dialog. Uploads pause and pick up next time the app is open and online. The uploading status line's tooltip says so. |
| "All safe" summary | One status line at the bottom of the video list, only while connected. |
| Where actions live | Every storage action is in **Settings › Storage**. Rows and the status line only show state. |
| Finder | A `Video is in OneDrive.webloc` file stands in for a video that left this Mac. |

## 2. Vocabulary (these words and no others)

- **on this Mac**: never "local", "device" or "downloaded". "Download" is fine as a verb ("download back to this Mac").
- **in OneDrive**: never "cloud" in text. The cloud *glyph* is fine. The **only** exception is the mode name *Always in cloud*.
- **safe**: only after OneDrive confirms the whole file (size or hash).
- **paused**: we wait and it continues by itself. Muted.
- **not uploaded**: something is wrong. Accent.
- Never say **sync** or **synced**.

**Colour has two meanings only:** `--color-text-muted` = nothing to do, `--color-accent` = you need to look. No new tokens. Shape always carries the meaning too.

**The accent rule:** every accent state appears (1) on its row, (2) in the status line and (3) as the problem notice in Settings › Storage, which holds its **one** fix. No accent state has a fix anywhere else.

## 3. Where each action lives (one place each)

| Action | The only place |
|---|---|
| Connect OneDrive | Settings › Storage · **Connect OneDrive** |
| Choose / switch mode | Settings › Storage · **Keep videos** |
| Sign in again | Settings › Storage · problem notice |
| Manage OneDrive storage (full) | Settings › Storage · problem notice |
| Try again (video couldn't be read) | Settings › Storage · problem notice |
| Show the folder in OneDrive | Settings › Storage · account block |
| Disconnect / Stop disconnecting | Settings › Storage · bottom |
| Remove a video or record | Row right-click menu (existing items, new confirm copy) |
| Open the record folder | Row right-click menu (existing item) |
| Go to Settings › Storage from the list | Click the status line (navigation only) |

The right-click menu gets **no new items**.

---

## 4. Step counts (common path first)

| Flow | Steps |
|---|---|
| Play any video | 1 |
| Add a video | 0 extra |
| "Is it safe?" | 1 glance |
| Connect | 6 (Settings · Storage · Connect · Microsoft: account · password/MFA · consent). The app returns to the front by itself, with Backup already selected. |
| Free up space | Connect + 2 (pick Smart or Always in cloud · confirm) |
| Fix any account or video problem | 2 (click status line · fix button) + Microsoft's page if needed |
| Disconnect | 4 (Settings · Storage · Disconnect · confirm) |

If a change to this spec raises any of these numbers, it needs a reason (safety, consent, money or data loss).

---

## 5. Settings › Storage

### 5.1 Entry

- A third item in the Settings rail, **Storage**, after Profile and Score. Phosphor `Cloud`, duotone, same size and same `radiogroup` as the rail. Tooltip and accessible label: "Storage".
- Same content column, heading size and spacing as ProfilePanel / ScorePanel.
- App-wide. Under the heading, micro muted: **For all Spaces.**

### 5.2 Not connected (default for everyone)

Top to bottom, left-aligned:

1. Heading **Storage**
2. Micro, muted: For all Spaces.
3. Body: **Your videos are stored on this Mac.**
4. Body, muted: Connect OneDrive to keep a copy safe in OneDrive, or to free up space on this Mac. Master's Wheel works fully without it.
5. Primary button: **Connect OneDrive**
6. Micro, muted, under the button: Works with personal and work Microsoft accounts. Only videos are uploaded. Notes, transcripts and scores stay on this Mac.

Nothing else here, and nothing outside this panel changes: no row glyphs, no status line.

### 5.3 Connect flow

1. Click **Connect OneDrive**. Microsoft's standard sign-in opens in the default browser (system browser + loopback redirect). The button becomes a disabled **Waiting for Microsoft sign-in…**, with a text button **Cancel** to its right. Line 6 stays.
2. The user signs in. The browser shows Microsoft's normal "you can close this window", and Master's Wheel comes to the front by itself.

| Outcome | What the user sees | Focus |
|---|---|---|
| Success | Connected panel (5.4), **Backup** selected. The numbers line shows the first upload moving. The status line appears under the video list. Uploads start at once, newest first. | Panel heading |
| Cancel (button, or declined in the browser) | 5.2 plus a muted line under the button: *Not connected. Your videos stay on this Mac, as before.* It clears on the next Connect. | Connect OneDrive |
| Organization blocks it | 5.2 plus an accent line: *Your organization doesn't allow Master's Wheel to use OneDrive. Ask your IT team, or connect with another account.* | Connect OneDrive (same button; Microsoft lets them pick another account) |
| Offline when clicking | The browser is not opened. Muted line: *You're offline. Connect to the internet, then try again.* | Connect OneDrive |
| Any other failure | Accent line: *Couldn't connect to OneDrive. Please try again.* | Connect OneDrive |
| User leaves Settings while waiting | Sign-in still finishes. The status line appearing under the list is the success signal. | — |

No timeout. Waiting lasts until success or Cancel.

**Reconnecting to an account used before:** find the existing folder and match videos already there by record, so nothing uploads twice. Videos left only in OneDrive (after "Disconnect anyway", 5.7) play again.

### 5.4 Connected

Top to bottom:

1. Heading **Storage** · micro "For all Spaces."
2. **Account block**
   - Label: **OneDrive**
   - Body: Connected as **maria@acme.com**
   - Muted: Videos go to OneDrive › Apps › Master's Wheel · text button **Show in OneDrive** (opens that folder on OneDrive web)
3. **Problem notice** (only when one exists, 5.6)
4. **Keep videos**: a `radiogroup` with three large rows. Each row has a radio, the name (label size), the line (body) and the hint (micro muted):

   | Name | Line | Hint |
   |---|---|---|
   | **Backup** · micro tag "Recommended" | Every video stays on this Mac, and a copy is kept safe in OneDrive. | For peace of mind. Doesn't free up space. |
   | **Smart** | Videos added or watched in the last 14 days stay on this Mac. Older ones live in OneDrive and play from there. | Frees space and keeps recent calls ready offline. |
   | **Always in cloud** | Videos live in OneDrive and play from there. This Mac keeps a copy only until it's safe. | Frees the most space. Needs internet to play. |

   Arrow keys move the selection. Selecting a row applies at once if nothing moves. Otherwise it opens the switch confirm (5.5). It never applies silently when videos will move.
5. **Numbers line**, micro muted. **One rule:** while anything is moving it shows the movement, otherwise the totals.
   - Uploading (including the first upload after connecting): *Uploading 37 videos · 12.4 GB left*
   - Mode switch: *Moving 142 videos to OneDrive · 38 left* / *Downloading 170 videos to this Mac · 31 GB left*
   - Disconnecting: *Disconnecting · downloading 142 videos · 31 GB left*
   - Totals, Backup: *On this Mac: 65.4 GB · In OneDrive: 65.4 GB*
   - Totals, Smart / Always in cloud: *On this Mac: 12.0 GB · In OneDrive: 53.4 GB · Freed 41.4 GB* ("Freed" only once it's above 0)
6. **Disconnect OneDrive…**: a plain text button at the bottom, with space above it. It becomes **Stop disconnecting** while a disconnect runs (5.7).

No primary button. In normal use there's nothing to do here.

### 5.5 Switching modes

Rule: **a copy leaves this Mac only after its receipt. Downloads need room, and room is checked before anything starts.**

| From → To | What happens | Confirm sheet (title · body · buttons) |
|---|---|---|
| Backup → Smart | Videos not added or watched in 14 days leave this Mac once safe. | **Switch to Smart?** · *142 older videos will move to OneDrive, freeing about 41 GB. Each one leaves this Mac only after it's safe in OneDrive.* · **[Switch to Smart]** [Cancel] |
| Backup or Smart → Always in cloud | Every video still on this Mac leaves once safe, except one being transcribed or played right now. | **Switch to Always in cloud?** · *182 videos will move to OneDrive, freeing about 53 GB. They'll need internet to play. Each one leaves this Mac only after it's safe in OneDrive.* · **[Switch to Always in cloud]** [Cancel] |
| Always in cloud → Smart | Videos from the last 14 days download back. | **Switch to Smart?** · *12 recent videos (4.1 GB) will download back to this Mac. You can keep working.* · **[Switch to Smart]** [Cancel] |
| Smart / Always in cloud → Backup | Every video only in OneDrive downloads back. | **Switch to Backup?** · *170 videos (49 GB) will download back to this Mac. You have 80 GB free. This may take a while. You can keep working.* · **[Switch to Backup]** [Cancel] |
| Any download, not enough room | Nothing starts. | Same title · *170 videos (49 GB) need to download back to this Mac, but you have 30 GB free. Free up 19 GB first.* · [Switch] **disabled** · **[Cancel]** focused |
| Nothing moves (count = 0) | Applies at once. | no sheet |
| Offline | The sheet shows as above, plus one line: *You're offline, so this starts when you're back.* Confirming sets the mode. The moves wait for the internet. | as above |

- Cancel has focus by default. Escape cancels. Cancel puts the radio back on the old mode.
- While a switch runs: the numbers line and the status line both show the progress (5.4, 6.2). Rows change glyph one by one as each video lands, with no motion.
- Switching again mid-way is allowed. The newest choice wins from that moment. Videos already moved stay moved unless the new mode needs them back.

### 5.6 Problem notice (the one place to fix things)

Position 3 of the Connected panel. Full width, a 2 px left rule in `--color-accent`, body text and at most one button. **Only the highest-priority problem shows** (same order as 6.2).

| Problem | Text | Button |
|---|---|---|
| Signed out / token expired | **Signed out of OneDrive.** Uploads are paused, and 12 videos can't play until you sign in. | **Sign in again** (the 5.3 browser flow; on success the notice clears and uploads continue from where they paused) |
| Signed in with a different account | **That's a different account.** Sign in as maria@acme.com, or disconnect first to use another account. | **Sign in again** |
| OneDrive is full | **OneDrive is full.** New videos stay on this Mac until there's space, so nothing is lost. | **Manage storage** (Microsoft's storage page in the browser) |
| Organization revoked access | **Your organization no longer allows Master's Wheel to use OneDrive.** Your videos on this Mac are fine. | none (Disconnect stays at the bottom) |
| Video(s) missing in OneDrive, not on this Mac | **We can't find 1 video in OneDrive:** "Acme discovery call". It may have been deleted there. You can remove it from its record if you no longer need it. | none |
| Video(s) couldn't be read | **1 video couldn't be uploaded** because its file couldn't be read: "Acme discovery call". It's still on this Mac. | **Try again** (puts every unreadable video back in the queue) |

Name up to 3 titles, then "and N more". When there's room again, the account is back or the file uploads, the notice clears by itself and paused uploads continue. The app checks space and account on open and whenever it comes back online.

### 5.7 Disconnecting

Click **Disconnect OneDrive…** and a sheet opens, with Cancel focused:

| Situation | Sheet | Buttons |
|---|---|---|
| Every video is on this Mac | **Disconnect OneDrive?** · *All your videos are on this Mac and stay there. The copies in OneDrive › Apps › Master's Wheel stay in OneDrive. Master's Wheel stops uploading.* | **[Disconnect]** [Cancel] |
| Some only in OneDrive, enough room | **Disconnect OneDrive?** · *142 videos are only in OneDrive (41 GB). They'll download back to this Mac first, then OneDrive disconnects. You have 80 GB free.* | **[Download and disconnect]** [Cancel] |
| Some only in OneDrive, not enough room | *142 videos are only in OneDrive (41 GB), but you have 30 GB free. Free up 11 GB first, or stay connected.* | [Download and disconnect] **disabled** · **[Cancel]** |
| Some only in OneDrive, signed out, offline or access revoked | *142 videos are only in OneDrive and can't download right now (you're signed out / offline / your organization removed access). If you disconnect anyway, they stay in OneDrive and won't play here until you connect again.* | **[Cancel]** · [Disconnect anyway] (plain text button) |

- **While downloading before disconnecting:** the numbers line shows the progress, and the bottom button reads **Stop disconnecting** (keeps the account, in its current mode). Uploads and offloading pause meanwhile.
- **When done:** the panel goes back to 5.2. The status line and all row glyphs disappear. Sign-in tokens are deleted. Nothing in OneDrive is deleted.
- **After "Disconnect anyway":** the panel shows 5.2. Only the stranded videos keep a glyph (6.1), and the status line stays in its stranded state (6.2). Connecting again with the same account makes them play.

---

## 6. The video list

### 6.1 Per-video status glyph

- **Where:** right edge of each `VideoListItem`, vertically centred, 14 px, in a fixed slot so titles never shift. The existing call-state glyph on the left doesn't change.
- **Colour:** calm = `--color-text-muted`, uploading = `--color-text`, problem = `--color-accent`.
- **Short label:** only non-calm states add one, after a middle dot on the existing date line: *12 Nov · Uploading 42%*.
- **Full line:** the glyph's tooltip, also its `aria-label` and part of the row's accessible name. The row's `title` stays as is.
- **Not connected:** no slot. The row is exactly as today.
- **The glyph has no action.** Clicking the row works as today.

| State | Glyph | Short label | Full line (tooltip / screen reader) | Click / play |
|---|---|---|---|---|
| Waiting to upload | empty ring, muted | Waiting to upload | On this Mac. It will upload to OneDrive soon. | plays from this Mac |
| Uploading | ring filling, text colour | Uploading 42% | On this Mac, uploading to OneDrive (42%). You can keep working or play it. | plays from this Mac |
| Checking | full ring, no check | Checking… | Upload finished. Checking that OneDrive has the whole file. | plays from this Mac |
| Paused (offline, sleep, quit, signed out) | ring at its exact %, muted | Paused | Upload paused at 42%. It continues on its own when you're online. *(Signed out: …when you sign in again.)* | plays from this Mac |
| Safe, on this Mac | check, muted | — | Safe in OneDrive, and on this Mac. Plays without internet. *(Smart adds: On this Mac until 9 Dec.)* | plays from this Mac |
| Safe, only in OneDrive | cloud, muted | — | Safe in OneDrive. Plays from there (needs internet). | streams |
| Only in OneDrive, offline | cloud, muted; **title and date muted** | Needs internet | Safe in OneDrive, but it needs internet to play. | opens the record; player shows 6.4 line |
| Only in OneDrive, signed out | cloud, muted; title and date muted | Needs sign-in | Safe in OneDrive. Sign in again in Settings › Storage to play it. | opens the record; 6.4 line |
| Not uploaded: OneDrive full | dot, accent | Not uploaded | Not uploaded: OneDrive is full. It's still on this Mac. Make room in Settings › Storage. | plays from this Mac |
| Not uploaded: file can't be read | dot, accent | Not uploaded | Not uploaded: this file couldn't be read. It's still on this Mac. Try again in Settings › Storage. | as today |
| Missing in OneDrive, not on this Mac | dot, accent; title and date muted | Missing in OneDrive | We can't find this video in OneDrive. It may have been deleted there. | opens the record; 6.4 line |
| In OneDrive, not connected (after "Disconnect anyway") | cloud, muted; title and date muted | In OneDrive | This video is in OneDrive. Connect OneDrive in Settings › Storage to play it. | opens the record; 6.4 line |

Rules:
- **Missing in OneDrive but still on this Mac:** no special state. It uploads again by itself (Waiting → Uploading → Safe).
- **New videos** always start as *Waiting to upload*, on this Mac, fully playable and transcribable. In Always in cloud, the copy on this Mac stays until it's safe **and** its transcription has finished.
- **Smart bringing a video home:** the cloud glyph stays while it downloads, then swaps to a check when it's complete. No progress on the row.
- **Upload and transcription progress never share a row.** Transcription progress stays where it is today (TranscriptionProgress in the detail pane).
- Short network or server errors are **Paused** with automatic retries, never "Not uploaded".
- **Organization revoked access:** rows behave as *signed out* (uploads show *Paused*, cloud rows are dimmed), but cloud rows use the short label **Not available** and the full line *Safe in OneDrive, but your organization no longer allows Master's Wheel to open it.* No new glyph.

**Motion (the only motion in this feature):** the ring's stroke grows with progress (SVG stroke-dashoffset). When the receipt lands, the full ring becomes a check with one 150 ms scale from 0.9 to 1, with no bounce and no colour flash. Every other glyph change is an instant swap. With `prefers-reduced-motion`: the ring moves in 10% steps and the check swaps in with no scale. **The check is driven by the real confirmation, never by a timer.** No sound anywhere.

### 6.2 The status line (the only storage message outside Settings)

- **Where:** pinned to the bottom of the video list (Navigation), under the scrolling list, full width. One line of label-size text, an ellipsis if too long (full text in the tooltip), and a hairline `--color-border` rule above.
- **When:** only while connected, or while stranded videos exist.
- **What it does:** it's one button that opens **Settings › Storage**, and nothing else. Accessible name: the text + ", open storage settings". It's a polite live region.
- **Shows one state**, highest priority first:

| Priority | State | Text | Colour |
|---|---|---|---|
| 1 | Signed out (also after a wrong-account sign-in) | **Signed out of OneDrive** · uploads paused | accent |
| 1 | Organization revoked access | **OneDrive access removed** · uploads stopped | accent |
| 2 | OneDrive full | **OneDrive is full** · 3 videos not uploaded | accent |
| 3 | Offline, something only in OneDrive | **Offline** · 12 videos need internet to play | muted |
| 3 | Offline, nothing only in OneDrive | **Offline** · uploads continue when you're back | muted |
| 4 | Missing in OneDrive | 1 video missing in OneDrive | accent |
| 4 | Couldn't be read | 1 video not uploaded | accent |
| 5 | Disconnecting | Disconnecting · 31 GB left to download | muted |
| 5 | Mode switch running | Moving 142 videos to OneDrive · 38 left / Downloading 170 videos to this Mac · 31 GB left | muted |
| 6 | Uploading | 3 uploading · 1.2 GB left | text |
| 7 | Everything safe | All 214 videos safe in OneDrive | muted |
| 7 | Connected, no videos yet | OneDrive connected · new videos go there | muted |
| — | Stranded (not connected) | 4 videos in OneDrive · connect to play them | muted |

- **"All N videos safe" appears only when every video really is safe.**
- Uploading tooltip: *If you quit or close the lid, uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe.*
- Text swaps with a 200 ms crossfade (instant with reduced motion).
- Offline is muted (wait). Signed out is accent (act). They never look alike.
- It moves to the next state by itself. Nothing needs dismissing.

### 6.3 Remove confirms (existing dialogs, new copy when connected)

- Remove video: *Remove the video from "Acme discovery call"? This removes it from this Mac **and from OneDrive**. Notes and transcript stay.*
- Remove record: *Remove "Acme discovery call"? This removes it from this Mac **and its video from OneDrive**.*
- If offline or signed out, add: *It's removed from OneDrive when you're next online.* (Queue the delete.)
- Not connected: copy exactly as today.

### 6.4 The player (MediaPlayer)

- **Playing from this Mac:** no change.
- **Streaming:** same player and controls. A micro muted **Playing from OneDrive** at the player's bottom-left, under the controls row. If buffering lasts over ~1 s (on start or after a seek), it reads **Loading from OneDrive…** until playback resumes. Never a spinner without words, never a "download first" step. Transcript timestamps and scrubbing seek in the stream (use range requests).
- **Can't play here:** one centred body-text line in place of the video. No broken player and no error icon. Notes, transcript and scorecard work normally.
  - Offline: *This video is in OneDrive. Connect to the internet to play it.*
  - Signed out: *This video is in OneDrive. Sign in again in Settings › Storage to play it.*
  - Missing: *We can't find this video in OneDrive. It may have been deleted there.*
  - Stranded: *This video is in OneDrive. Connect OneDrive in Settings › Storage to play it.*
  - Org revoked: *This video is in OneDrive, but your organization no longer allows Master's Wheel to open it.*
- **Re-transcribe a video only in OneDrive:** the existing TranscriptionProgress shows **Fetching from OneDrive…** first, then the normal steps. In Always in cloud the fetched copy is removed afterwards. In Smart it counts as watched (subject to §7 rule 5). Offline or signed out: re-transcribe is disabled, with the matching line above as its tooltip.

---

## 7. Rules for copies on this Mac (all in one place)

1. A copy leaves this Mac **only** after its receipt (size or hash confirmed by OneDrive). Never on "upload started".
2. **No copy leaves while offline**, even if Smart's 14 days pass mid-flight. Offloading waits until online.
3. A copy never leaves while it's playing or being transcribed.
4. If OneDrive is full or the user is signed out, every copy waiting to upload stays on this Mac.
5. **Room guard:** Smart brings a watched video home only if, after the download, free space stays above 10% of the disk **and** above 5 GB. Otherwise it only streams, the 14-day timer isn't reset, and nothing is shown. (Tune the numbers if needed; don't drop the guard.)
6. Mode-switch and disconnect downloads check for room before they start (5.5, 5.7).
7. The Always in cloud streaming buffer is cleared when the user leaves the video.

**Offline** means no network or OneDrive unreachable. **Signed out is not offline** and has its own state everywhere. Videos added offline start as *Waiting to upload*. Interrupted uploads show *Paused* at their exact % and continue from there once online, **including after a quit or restart** (resumable upload session). They never restart from 0% and never show "Not uploaded".

## 8. Finder and OneDrive

- When a video leaves this Mac, write `Video is in OneDrive.webloc` into its record folder. It opens the video on OneDrive web. Remove it when the video comes back.
- Ignore this file when looking for `hero.<ext>`.
- Track files by OneDrive item ID, not path, so renaming or moving them inside OneDrive doesn't break playback. If deleted there: *Missing in OneDrive*, or a quiet re-upload if still on this Mac.

## 9. Accessibility

- The existing four text sizes and the core palette only. Muted text meets 4.5:1 on `--color-surface` (verify with the real tokens). Dimmed rows use the muted token, not opacity.
- Glyphs differ by **shape** (empty ring, filling ring, full ring, check, cloud, dot), never colour alone.
- Every glyph has an `aria-label` with its full line. The status line is a button and a polite live region.
- Mode choice is a `radiogroup` with arrow keys. Sheets trap focus, Cancel is focused, Escape cancels, and focus returns to the opener.
- Targets are at least 24 px (status line and text buttons included). The 14 px glyph is not a target.
- Reduced motion: the ring moves in steps, and every swap is instant.

## 10. State checklist

| # | State | Look | Label | Action |
|---|---|---|---|---|
| 1 | Not connected | 5.2, no list UI | Your videos are stored on this Mac. | Connect OneDrive |
| 2 | Waiting for sign-in | disabled button | Waiting for Microsoft sign-in… | Cancel |
| 3 | Sign-in cancelled | 5.2 + muted line | Not connected. Your videos stay on this Mac, as before. | Connect OneDrive |
| 4 | Org blocked at connect | 5.2 + accent line | Your organization doesn't allow… | Connect OneDrive |
| 5 | Offline at connect | 5.2 + muted line | You're offline… | Connect OneDrive |
| 6 | Connect failed | 5.2 + accent line | Couldn't connect to OneDrive… | Connect OneDrive |
| 7 | Connected, uploading | 5.4, numbers line moving | Uploading 37 videos · … left | none needed |
| 8 | Connected, steady | 5.4, numbers line totals | Connected as … | none needed |
| 9 | Switch confirm | sheet | 5.5 copy | Switch / Cancel |
| 10 | Switch blocked (no room) | sheet, Switch disabled | …Free up N GB first. | Cancel |
| 11 | Switch running | numbers line + status line | Moving… / Downloading… | none (switch again allowed) |
| 12 | Signed out | notice + accent status line + dimmed cloud rows | Signed out of OneDrive | Sign in again |
| 13 | Wrong account | notice | That's a different account… | Sign in again |
| 14 | OneDrive full | notice + accent status line + Not uploaded rows | OneDrive is full | Manage storage |
| 15 | Org revoked | notice + accent status line + dimmed "Not available" cloud rows | …no longer allows… / OneDrive access removed | Disconnect (bottom) |
| 16 | Offline | muted status line + dimmed cloud rows | Offline · … | none (clears by itself) |
| 17 | Row: waiting / uploading / checking / paused | rings | 6.1 | none (plays) |
| 18 | Row: safe on this Mac / only in OneDrive | check / cloud | tooltip only | plays / streams |
| 19 | Row: needs internet / needs sign-in | dimmed cloud | Needs internet / Needs sign-in | opens record; sign in via Settings |
| 20 | Row: not uploaded (full) | accent dot | Not uploaded | Manage storage (Settings notice) |
| 21 | Row: not uploaded (unreadable) | accent dot + notice + status line | Not uploaded | Try again (Settings notice) |
| 22 | Row: missing in OneDrive | accent dot, dimmed + notice + status line | Missing in OneDrive | none required; Remove video (menu) if wanted |
| 23 | Row: stranded after disconnect | dimmed cloud | In OneDrive | Connect OneDrive (Settings) |
| 24 | Player: streaming / buffering | micro label | Playing from OneDrive / Loading from OneDrive… | none |
| 25 | Player: can't play | centred line | 6.4 copy | as stated in the line |
| 26 | Re-transcribe, only in OneDrive | TranscriptionProgress | Fetching from OneDrive… | none |
| 27 | Remove confirm, connected | existing confirm | …and from OneDrive. | Remove / Cancel |
| 28 | Disconnect confirm (4 variants) | sheet | 5.7 copy | Disconnect / Download and disconnect / Disconnect anyway / Cancel |
| 29 | Disconnecting | numbers line + status line | Disconnecting · … left | Stop disconnecting |
| 30 | All safe | status line | All 214 videos safe in OneDrive | opens Settings |

## 11. Out of scope (don't build)

Sharing, multiple accounts or one account per Space, other clouds, per-video pinning, syncing or restoring between Macs, storing notes/transcripts/scores, changing the 14-day window, bandwidth or Wi-Fi-only settings, Frame Drills takes, notifications, Dock badge, sound, a quit dialog, a first-run connect prompt, and any new right-click menu item.

## 12. Assumptions to verify while building

- The browser hand-off for sign-in (system browser + loopback redirect) takes under a minute and returns to the app by itself, for both personal and work accounts.
- Muted text meets 4.5:1 on the real `--color-surface`.
- Example numbers, names and dates are placeholders.

---

## Sign-off checklist (Eraser)

- [x] Every main flow is listed and counted (§4). The common path (play, add, "is it safe?") costs 0–1 steps.
- [x] **No double paths:** every action has exactly one place (§3). The status line is navigation only. The right-click menu gets no new items.
- [x] **One summary signal:** the status line is the only storage message outside Settings. No banners, notifications, badges or sound.
- [x] **One word per concept** (§2). The only "cloud" in text is the mode name *Always in cloud*.
- [x] **Accent rule holds:** every accent state is on the row, in the status line and fixed in one Settings notice. No dead ends.
- [x] **"All safe" is never shown unless it's true.** The check appears only after the real receipt.
- [x] **The last copy is untouchable:** §7 rules 1–4, plus room checks before every download (§7 rules 5–6).
- [x] Every confirm that's left protects data or disk space (switch, disconnect, remove). Undo is used where possible (Stop disconnecting, Cancel restores the mode).
- [x] Not connected = today's app, unchanged.
- [x] Every top behavior (#1–#9) and every watch-out (W1–W14) is covered. Mapping in `04-cleanup-review.md` §6.
- [x] Magic is kept on purpose and is honest: ring + receipt check, status line, `.webloc`, the brought-home swap. "Finished since you last looked" and "First up" were cut.

**Signed: Eraser, 2026-11-25. APPROVED for build.**
