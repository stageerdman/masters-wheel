# OneDrive storage: magic, names and moments

Author: Merlin (Magic Director) · 2026-11-25 · Builds on: `01-research.md` (Columbo) · Read by: Jony (03-ui-spec), Eraser (04 / SPEC)

Behavior labels such as **#4 Is it safe yet?**, **D6** and **W1** point to `01-research.md`. #n is the behavior table, Dn is a deep dive and Wn is the "Watch out" list.

---

## 1. The human truth

The research names the job: *"Keep my recordings safe and my Mac light, without thinking about it."*

The obvious magic for "cloud" is things floating up, glowing, confetti, a vault door. All of that is decoration. It also pulls the eye during a drill (#5) and gets in the way of playing a video (#1).

Digging further turned up a less obvious point:

> **People don't trust a progress bar. They trust a receipt.**
> A parcel isn't "sent" when it leaves your hands. It's sent when someone on the other side signs for it.

Every real fear in the research is a fear about a missing receipt: "deleted before upload" (W1), "a check mark that shows up before the upload is confirmed" (D4), "is it gone from OneDrive too?" (W8). So the magic here isn't spectacle. It's **the moment of being signed for**, made visible, honest and a little warm.

The second point comes from the coach with a full Mac (#13, #17). Freeing space feels like loss ("where did my video go?", W14). Libraries solved this long ago. Older books move to the stacks but **stay in the catalogue**, and anyone can request one. Nothing disappears from the list. Only where the book is changes.

## 2. Worlds I tested

| # | Source | What maps well | What breaks | Verdict |
|---|---|---|---|---|
| 1 | **Registered post / signed receipt** | upload = in transit; "safe" = countersigned; paused = parcel waiting at the depot, not lost; failed = returned to sender *with a reason* | none, as long as it stays in motion and tone, not in nouns | **Keep (core)** |
| 2 | **Library stacks / catalogue** | Smart = older items move to the stacks; the list is the catalogue (nothing vanishes from it); streaming = reading-room request; offline = the stacks are closed today | words like "stacks" or "archive" would need explaining, and they clash with the real word *OneDrive* the user sees in Finder and on the web (#20) | **Keep as behavior, not words** |
| 3 | **The wheel (the app's own name)** | a progress ring is a small wheel. One full turn = "came full circle" = done. It ties the app's identity to the safest moment | on its own it's the usual download ring | **Keep as the shape language for 1** |
| 4 | Game tape / film room (coaches keep game film) | native to coaching; "tape library" | users say "call" or "video", and the app says "record". A third noun would confuse them | Backup world (not used) |
| 5 | Seasonal clothes in the attic | recent close at hand, older stored away | domestic and a bit off-tone for sales pros; "attic" sounds like a dusty, slow place | Cut |
| 6 | Seed bank (Svalbard duplicate deposits) | Backup = a duplicate kept safe far away | says nothing about streaming or Smart, and needs explaining | Cut |
| 7 | Tides (out and back) | Smart rhythm | forced; tides come back on their own and videos don't | Cut |

**Recommended world: "Signed for, and still in the catalogue."** Worlds 1+2, drawn with world 3's ring.
- **Uploading** is a parcel in transit. The ring turns.
- **Safe** means OneDrive has signed for it: the ring closes into a check, and only after confirmation (size or hash check, W1).
- **Paused** is waiting at the depot. Nothing is lost, it continues by itself (D6).
- **Failed** is returned *with a reason* and *one action* (Key insight 4).
- **Smart / Always in cloud** are the stacks. The row never leaves the list. Only a small cloud mark shows where it lives (W14, #7).
- **Offline** means the stacks are closed. You can see what you can't fetch *before* you click (W3).

The metaphor lives only in **behavior, motion and tone of voice**. Every label stays plain and literal ("Safe in OneDrive", "On this Mac"), because the brief says meaning must stay exact and the research says confusion about *where a file is* is the top complaint (Context: Files On-Demand).

**Backup world (if the team wants more flavor):** the film room (world 4). Use it only if the product later starts calling recordings "tape". Not now.

## 3. Ideas from inside the world (raw, before filtering)

1. The ring around the status glyph fills as the upload goes. One full turn means done.
2. At 100% the ring **holds** and reads "Checking…" until OneDrive confirms. Only then does it close into a check (the receipt).
3. The check "settles": a single 150 ms scale from 0.9 to 1, once, with no bounce.
4. A summary line, "All 214 videos safe in OneDrive". It's the one "backup complete" signal (D4, Q8).
5. A paused ring goes grey and stays at its exact percentage, then resumes from there (D6, "uploads starting from 0% again").
6. On return: "2 uploads finished since you last looked", shown once, then gone.
7. Connect success shows the account and folder, plus "First up: 37 videos · 12.4 GB", and the first row's ring starts turning while you're still looking.
8. Space reward in Settings: "Freed 41.2 GB on this Mac".
9. Smart row tooltip: "On this Mac until 9 Dec". It answers "when will it go?" without a countdown.
10. A small cloud mark on rows that live only in OneDrive (a place mark, separate from the safety mark).
11. Offline: cloud-only rows dim slightly and read "Needs internet", before the click.
12. Signed out looks different from offline: grey means *wait*, accent means *you need to act* (W6).
13. In the player, a quiet "Playing from OneDrive" micro-label instead of a spinner. "Loading from OneDrive…" appears only if buffering passes about 1 s.
14. Re-transcribing a cloud-only video, one label in sequence: "Fetching from OneDrive… → Transcribing…" (W13).
15. A Finder note: when a hero file leaves the Mac, a tiny `Video is in OneDrive.webloc` sits in the record folder and opens the file on the web (W14, #18).
16. Watching an old Smart video brings it home. The cloud mark flips to the Mac mark once it's fully local: "On this Mac for 14 more days" (D7, Q2).
17. A soft "paper" sound when the check lands.
18. A macOS notification "All videos safe" when the queue empties.
19. A Dock badge counting pending uploads.
20. A cloud floating up from the row when an upload starts.
21. A connect celebration (confetti or a glow) after sign-in.
22. A "leaving in 2 days" badge on rows close to 14 days.
23. Naming OneDrive "the Archive" or "the Vault" in the app.
24. A wheel-turn animation on the Settings icon while uploads run.
25. Delete confirm says where the copies are and what will be removed (W8).
26. Disconnect confirm states the count of cloud-only videos and what happens to them (W7).
27. Mode switch shows its consequence in numbers before it applies (W9).
28. Quit with uploads pending: one honest line saying they will continue next time (D6).

## 4. The filter: what survives

Kept only if it **means something, is light, never slows play or drill, still feels fine the 100th time, and never hides where a video is.**

### Moment 1 · The receipt (uploading → safe)
- **Behavior:** #4 Is it safe yet? (D4), #3 Drop and go (D3), W1.
- **What happens:** the row's status glyph has a thin ring that fills with upload progress (ideas 1+2+3). At 100% it holds as **"Checking…"** until OneDrive confirms the full file. Then the ring closes into a check with one 150 ms settle. No bounce, no colour flash, no sound.
- **What the user feels:** "It's *really* there." The check means something because it waits.
- **Why it helps:** the research's top trust risk is a check that shows up too early (D4) and a local copy removed too early (W1). The wait in the animation *is* the safety rule, shown on screen.
- **Weight:** very light (an SVG ring with a stroke-dashoffset, one transform). Reduced motion: the ring updates in steps and the check swaps in with no scale.
- **Builder:** Jony specs the glyph states. Uncle Bob builds it.

### Moment 2 · "All safe": one line instead of checking rows
- **Behavior:** #4 (D4 "a single place that says all videos are safe"), Open question 8, D6 (before closing the lid).
- **What happens:** one summary line in the single place Jony picks. It reads **"3 uploading · 1.2 GB left"** while uploads run, and when the last receipt lands it changes to **"All 214 videos safe in OneDrive"**. Text swap only, with a 200 ms crossfade (instant with reduced motion). On next open, if uploads finished while the user was away, it says once: **"2 uploads finished since you last looked"**, then goes back to normal (idea 6 folded in).
- **What the user feels:** the careful keeper can close the lid with a clear mind, which is the "Backup complete" feeling the research says people trust.
- **Why it helps:** it cuts the urge to scan 200 rows. It's the *only* completion signal, so no notifications, Dock badge or sound are needed.
- **Weight:** trivial.
- **Builder:** Jony (placement, exactly one place), Uncle Bob.

### Moment 3 · Paused, not failed: the ring that waits
- **Behavior:** #6 Close the lid mid-upload (D6), #15 Add a video offline, Key insight 4.
- **What happens:** when the network drops, the Mac sleeps or the app quits, the ring turns grey (`--color-text-muted`) and **stays at its exact percentage**. Label: **"Paused · continues when online"**. When it continues, the ring picks up from that same point. It doesn't restart from zero, even visually.
- **What the user feels:** "Nothing broke. It remembered." Continuing from 40% rather than 0% is the reassurance.
- **Why it helps:** the research's worst morning-after moment is a "failed" after a normal sleep, or a restart from 0%. Grey means *wait*. Only real failures get the accent colour and an action.
- **Weight:** none beyond Moment 1 (it's a colour and a label).
- **Builder:** Jony (labels), Uncle Bob. Needs a backend that resumes uploads (Uncle Bob's call on the chunked upload session).

### Moment 4 · Still in the catalogue (Smart / Always in cloud leaving the Mac)
- **Behavior:** #13 Where did my disk space go?, #17 Free space now, #7 Rewatch an old call (D7), W1, W4, W14, #18 Look in Finder.
- **What happens:**
  - The row **never moves or disappears**. When a local copy leaves (only after its receipt), the small place mark next to the safety check quietly changes from **Mac** to **cloud**. No animation: it happens in the background when nobody is watching, and the user only needs the true state when they look.
  - Hover or detail on a Smart row that's still local: **"On this Mac until 9 Dec"** (no countdown badges on rows).
  - Settings > Storage shows the reward in numbers: **"On this Mac: 12.0 GB · In OneDrive: 53.4 GB · Freed 41.4 GB"**.
  - In Finder, the empty record folder gets a tiny `Video is in OneDrive.webloc` that opens the file on OneDrive web. That way the folder never looks like the video was deleted.
- **What the user feels:** the coach with a full Mac sees the space come back, and never thinks a call was lost.
- **Why it helps:** it answers the Files On-Demand confusion in the research ("where is my file?") with one fixed, literal place mark, and turns freed space into a visible win.
- **Weight:** light. The `.webloc` is one small file write per offloaded video, and it's optional if Jony or Eraser decide Finder honesty isn't worth it.
- **Builder:** Jony (place mark and storage line), Uncle Bob (offload job and `.webloc`).

### Moment 5 · The connect moment: see it start
- **Behavior:** #10/#11 Connect once and pick a mode (D8), W10 Client confidentiality, #21 Work-account sign-in.
- **What happens:** after sign-in the Storage panel shows, in this order:
  1. **"Connected as maria@acme.com"**, so it's clear *which account* (W10).
  2. **"Videos go to OneDrive › Apps › Master's Wheel"** with a *Show in OneDrive* link (D8 "tell people the folder name").
  3. **"Only videos are uploaded. Notes, transcripts and scores stay on this Mac."**
  4. **"First up: 37 videos · 12.4 GB. Nothing leaves this Mac until it's safe in OneDrive."**

  Meanwhile the summary line from Moment 2 already reads "37 uploading…", and the newest row's ring has started turning. No celebration.
- **What the user feels:** relief, plus the thing D8 says they want: "to *see* it working".
- **Why it helps:** the cautious, read-every-word user gets the three answers they came for (which account, what goes up, will anything be deleted) in four lines, plus proof that it has started.
- **Weight:** copy only.
- **Builder:** Jony (connect flow), Uncle Bob.

### Moments kept as copy, not motion (honesty moments)
These carry no animation. Their magic is being **told the truth before it happens**. The exact copy is in the naming table (section 6).
- **Offline, before the click** (#9, W3, D1): cloud-only rows dim to muted text and say *Needs internet*. Rows with a local copy look normal.
- **Signed out ≠ offline** (#14, W6): accent colour plus a *Sign in again* action, versus grey "waiting".
- **Streaming in the player** (#1, #8, D1, D7): "Playing from OneDrive" micro-label. "Loading from OneDrive…" only after about 1 s of real buffering, so nothing flashes on a fast stream.
- **Re-transcribe a cloud-only video** (#16, W13): one label that steps "Fetching from OneDrive… → Transcribing…".
- **Switch mode / disconnect / delete** (#22, #24, #12, W7, W8, W9): the consequence in numbers *before* confirming.
- **Quit with uploads pending** (D6): one line saying they continue next time.

### The moment with no magic, on purpose
- **Never connect** (#2, D2, Key insight 6): **zero** storage UI outside Settings. No rings, no "not backed up", no nudge. Leaving it out is the gift here.
- **Drill burst** (#5, D5): if takes are ever in scope, they **don't show the ring animation**. Their status appears only on hover or when something fails. Nothing moves on screen during a drill.

## 5. Cut ideas, and why

| Idea | Why cut |
|---|---|
| #17 soft sound when the check lands | Plays dozens of times a day, and 30 times in a drill. It would quickly become noise. Nothing in this story needs sound, so there's **no sound in this feature at all**. |
| #18 macOS notification "All videos safe" | Chatty (Key insight 8), and a second place for the same signal as Moment 2. |
| #19 Dock badge of pending uploads | A second status location (Eraser's "one place only"), and a red badge reads as a warning to a calm user. |
| #20 cloud floating up from the row | Pulls the eye on every add, which breaks #5 drill flow. Decoration. |
| #21 connect confetti or glow | Wrong emotion. The user is cautious and reading every word (D8), not celebrating. |
| #22 "leaving in 2 days" row badge | Noise on many rows, and it creates worry about something safe. The tooltip date (Moment 4) answers the same question when asked. |
| #23 calling OneDrive "the Archive" or "the Vault" | Needs explaining, and clashes with the real name the user sees in OneDrive itself (#20). Breaks "where is my file?". |
| #24 wheel spinning on the Settings icon | Motion with no new meaning. The summary line already says it. |
| #16 "brought home" flip after watching | **Depends on Open question 2.** Keep it only if the team decides that watching downloads a local copy. If it only streams and resets the timer, cut it and show nothing, because a flip would lie. |

## 6. Final naming table

Labels are literal on purpose. One word for each concept everywhere: **"on this Mac"** (never "local", "device" or "downloaded"), **"in OneDrive"** (never "cloud" in text; the cloud *glyph* is fine), **"safe"** (only after the receipt), **"paused"** (wait) vs **"not uploaded"** (act).

### 6a. Modes (pick exactly one)

I kept the three names from the goal. They're short and clear once paired with a line that says **what happens on this Mac** (D8), and renaming them would create a second vocabulary. Order runs from most to least on the Mac, with the safest first and marked as the default (D8 recommendation).

| Mode | One line (what happens on this Mac) | Small hint (who it's for, Key insight 7) |
|---|---|---|
| **Backup** *(recommended)* | Every video stays on this Mac, and a copy is kept safe in OneDrive. | For peace of mind. Doesn't free up space. |
| **Smart** | Videos from the last 14 days stay on this Mac. Older ones live in OneDrive and play from there. | Frees space and keeps recent calls handy offline. |
| **Always in cloud** | Videos live in OneDrive and play from there. This Mac keeps a copy only until it's safe. | Frees the most space. Needs internet to play. |

"Last 14 days" means **added or watched** in the last 14 days (research scope). If Jony needs it shorter: "Recent videos (last 14 days) stay on this Mac…".

### 6b. Video states (row: short label + glyph; tooltip/detail: full line)

The four technical states from the scope map to the two user questions (D4): **Is it safe?** is the check or ring. **Can I play it here without internet?** is the place mark (Mac or cloud).

| Technical state | Row label (short) | Glyph | Full line (tooltip / detail) |
|---|---|---|---|
| on device: waiting to upload | **Waiting to upload** | empty ring · Mac mark | On this Mac. It will upload to OneDrive soon. |
| uploading | **Uploading 42%** | ring filling · Mac mark | On this Mac, uploading to OneDrive (42%). You can keep working or play it. |
| uploading: confirming | **Checking…** | full ring, no check yet · Mac mark | Upload finished. Checking that OneDrive has the whole file. |
| uploading: paused | **Paused** | grey ring at its % · Mac mark | Upload paused at 42%. It continues on its own when you're online. |
| in cloud, copy also on this Mac (Backup, recent Smart, Always in cloud before offload) | **Safe** | check · Mac mark | Safe in OneDrive, and on this Mac. Plays without internet. *(Smart adds:* On this Mac until 9 Dec.*)* |
| in cloud, only there | **Safe · in OneDrive** | check · cloud mark | Safe in OneDrive. Plays from there (needs internet). |
| streaming (playback, shown in the player, not on the row) | **Playing from OneDrive** | none | (Only if buffering > 1 s:) Loading from OneDrive… |
| in cloud only, while offline | **Needs internet** | check · cloud mark, row text muted | Safe in OneDrive, but it needs internet to play. |
| failed (needs action) | **Not uploaded** | accent dot · Mac mark | Not uploaded: *reason*. It's still on this Mac. *[one action]* |
| cloud copy missing (W2) | **Missing in OneDrive** | accent dot | We can't find this video in OneDrive. *(If on this Mac:)* It's still on this Mac. [Upload again] *(If not:)* It may have been moved or deleted in OneDrive. |
| not connected | *(nothing)* | *(nothing)* | *(nothing; D2)* |

Failure reasons (the *reason* slot above, each with exactly one action):
- OneDrive is full → [Manage storage] (opens Microsoft's storage page)
- You're signed out of OneDrive → [Sign in again]
- This file couldn't be read → [Show in Finder]

### 6c. Offline, error and consequence messages

| When | Message | Action |
|---|---|---|
| Offline banner (no network or OneDrive unreachable) | **Offline.** 12 videos need internet to play. Uploads will continue when you're back. | none (it clears by itself) |
| Offline, nothing cloud-only | **Offline.** Uploads will continue when you're back. | none |
| Signed out / token expired (must look different from offline, W6) | **Signed out of OneDrive.** Uploads are paused and 12 videos can't play until you sign in. | [Sign in again] |
| OneDrive full (W5) | **OneDrive is full.** New videos stay on this Mac only until there's space. | [Manage storage] |
| OneDrive full, Always in cloud | **OneDrive is full.** New videos stay on this Mac until there's space, so nothing is lost. | [Manage storage] |
| Work account blocked (#21) | **Your organization doesn't allow this app to use OneDrive.** Ask your IT team, or sign in with another account. | [Try another account] |
| Sign-in cancelled | Not connected. Your videos stay on this Mac, as before. | none (connect stays available) |
| Quit with uploads pending (D6) | 3 uploads aren't finished. They'll continue next time you open Master's Wheel. They're safe on this Mac. | [Quit] [Keep open] |
| Summary, uploading | 3 uploading · 1.2 GB left | none |
| Summary, done | All 214 videos safe in OneDrive | none |
| Summary, on return | 2 uploads finished since you last looked | none (shown once) |
| Storage numbers | On this Mac: 12.0 GB · In OneDrive: 53.4 GB · Freed 41.4 GB | none |
| Re-transcribe a cloud-only video (W13) | Fetching from OneDrive… → Transcribing… | none |
| Delete a record (W8; wording assumes Open question 3 = "delete there too") | Delete "Acme discovery call"? This removes it from this Mac **and from OneDrive**. | [Delete] [Cancel] |
| Switch to Smart / Always in cloud (W9) | 182 older videos will move to OneDrive, freeing about 41 GB. Each one leaves this Mac only after it's safe in OneDrive. | [Switch] [Cancel] |
| Switch to Backup (W9) | 182 videos (41 GB) will download back to this Mac. You have 30 GB free. That's not enough, so free up 11 GB first. *(If enough:)* This may take a while. You can keep working. | [Switch] (disabled if not enough) [Cancel] |
| Disconnect (W7; wording depends on Open question 4) | 182 videos are only in OneDrive. *(Option A, download first:)* They'll download back to this Mac first (41 GB). *(Option B, leave there:)* They'll stay in OneDrive, but Master's Wheel won't be able to play them until you connect again. | [Disconnect] [Cancel] |
| Finder note file (W14) | `Video is in OneDrive.webloc` | opens the video on OneDrive web |
| Connect success | Connected as maria@acme.com · Videos go to OneDrive › Apps › Master's Wheel · Only videos are uploaded. Notes, transcripts and scores stay on this Mac. · First up: 37 videos · 12.4 GB. Nothing leaves this Mac until it's safe in OneDrive. | [Show in OneDrive] |

## 7. Rules every moment follows

- **Motion is progress, never decoration.** The only moving thing is the upload ring (which *is* information) plus one 150 ms settle and one 200 ms text crossfade. Reduced motion turns all of it into instant swaps.
- **Colour has two meanings only:** muted grey = waiting, nothing to do. Accent = you need to do something. No new colour tokens are needed (core palette only, per CLAUDE.md).
- **No sound** anywhere in this feature.
- **Never at play time:** nothing new appears between the click and the video playing (Key insight 2).
- **The check means "receipt".** It never appears before OneDrive confirms the whole file (W1, D4).

## 8. Hand-off

- **Jony (03-ui-spec):** use the Moments 1–5 behaviors and the section 6 table as the labels. Pick the *single* place for the summary line (Moment 2) and for the storage numbers. Decide the glyph pair (safety ring/check + place mark Mac/cloud) and where the full line appears (tooltip or detail). Wire in the answers to Open questions 2, 3 and 4, then drop the variants in 6c that don't apply.
- **Eraser (04 / SPEC):** check that no state uses a second word for "on this Mac" or "in OneDrive". Check that the summary line exists in exactly one place. Check that the `.webloc` (Moment 4) and the "brought home" flip (cut table) are kept or cut on purpose.
- **Uncle Bob (build, later):** the ring is a stroke-dashoffset SVG on the existing row glyph. Use only existing colour tokens. Honour `prefers-reduced-motion`. The "Checking…" hold must be driven by the real confirmation (size or hash), not by a timer.

## Assumptions I made

- The three mode names stay as given in the goal (Backup / Always in cloud / Smart). My work is in the one-liners and hints. If Columbo wants friendlier names, the fallback set is **Keep both / Keep recent / Cloud only**.
- "Checking…" is part of *uploading*, not a fifth state.
- Example numbers, names and dates in the copy (37 videos, maria@acme.com, 9 Dec) are placeholders.
- Frame Drills takes are out of scope (research assumption). If they come in, the drill rule in section 4 applies.
