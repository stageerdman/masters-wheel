# Performance Review: how people use it (research)

Author: Columbo (UX Detective). Phase 1 of `00-roadmap.md`.
Sources: the code in `src/elements/PerformanceReview/**` and `src/app/performance-review/page.tsx`; `src/lib/onedrive/storage.ts` and `panelText.ts`; `docs/onedrive-storage/SPEC.md`; `src/elements/AppHeader/**` (the header controls this screen sets up).
I could not watch real users. Every score is a reasoned guess about the people this app is built for: salespeople and coaches who review their own recorded calls on a Mac. **Assumptions are marked (A).**

## Summary
People "hire" this screen for one job: **"help me learn from a call while I still remember it, and find it again later."** Almost every visit starts at the list. The person either picks the newest call or searches for one client, then watches, reads and writes notes side by side.
Three things get in the way most:
1. The list is loud and hard to read. Each row has a big bold glyph at heading size, a raw ISO date, and a green bar for "reviewed".
2. The session's key facts (date, amount, what it was about) are hidden behind a "•••" button.
3. There are two ways to generate a scorecard: the header and the Scorecard view.

"Backed up" should be a quiet promise kept, not an alarm. Show a tiny mark only when the video is really safe in OneDrive. Show nothing at all for people who never connected OneDrive.

## Scope
**In:** the Performance Review screen as it is today: the list (Navigation, VideoListItem, StorageStatusLine), the Hero (title, MetaPanel, video, notes), Detail (the SplitRail views), KindIcon, and the header controls this screen sets up (state, reviewed, generate scorecard).
**Out:**
- How uploads work. That is Uncle Bob's part; we only read the status.
- Settings › Storage, and the Training Room.
- How good the AI content in each view is.
- Backing up notes, transcripts or scores. The SPEC stores **videos only**.
Why: this update is a calm-down and a status mark, not new features.

## Who and when
- **The seller after a call (A, main user):** at their desk, minutes after hanging up. Still a bit wired. Wants to catch what went wrong before it fades.
- **The coach or self-reviewer, weekly:** Friday afternoon or Sunday evening. Calmer, and going through several calls in a row.
- **Before a follow-up call:** 5 minutes before the meeting. In a hurry, and needs the client's facts fast.
- **The cautious one (OneDrive users only):** just connected OneDrive, or the Mac is filling up. Wants to know "if this laptop dies, are my calls safe?"
- It's a Mac app, so it's used on a laptop at a desk, never on a phone.

## Behavior table
Sorted by combined score. L = likelihood, F = frequency (1–10).

| # | Behavior | L | F | Reason |
|---|---|---|---|---|
| 1 | **Open the newest session** | 9 | 9 | It's the default way in: the newest call sits on top and is picked when the screen opens. Almost every visit starts here. |
| 2 | **Rewatch a moment and jot notes** | 8 | 8 | The main reason to record at all. Clicking a transcript line jumps the video there, and the notes box sits right under the player. |
| 3 | **Find a past session** (search by client or date) | 9 | 7 | Comes up with every follow-up and every "what did they say last time?" Less often than opening the newest, because most reviews are of recent calls. |
| 4 | **Scan the list for outcomes** (won, lost, postponed) | 8 | 7 | The state glyphs make the list a scoreboard. People glance at it on every visit, even when they came for something else. |
| 5 | **Read one session's scorecard** | 8 | 7 | It's the clearest "how did I do?" answer. It's read after each call, once it has been generated. |
| 6 | **Set the outcome and mark as reviewed** | 8 | 7 | Done once per call, but nearly every call gets it. It's the moment of closing the loop. |
| 7 | **Add a new session** (drop a recording) | 9 | 6 | Every session starts this way. It happens about once per call, so less often than reading. |
| 8 | **Generate a transcript, scorecard or analysis** | 8 | 6 | Needed once per call, per view. Waiting for AI makes people come back later. |
| 9 | **Check that a session is safe on OneDrive** | 7 | 6 | Only for people who connected OneDrive (A: about half). Very frequent in the first weeks and before big moments ("my disk is full", "new laptop"), then rare. I chose the lower F, as the rules say when unsure. Kept as a deep dive because this update is about it. |
| 10 | **Prepare for a follow-up** (Client Card, Questions) | 7 | 5 | High value but only before repeat meetings. |
| 11 | **Compare scores over time** ("am I getting better?") | 7 | 5 | People want it, but today it means clicking through sessions one by one. No score shows in the list. |
| 12 | **Show a session to a manager or colleague** | 5 | 3 | Screen-share or sitting together. It makes the screen's tidiness matter more than its usage numbers suggest. |
| 13 | **Fix the session's details** (date, amount, description) | 6 | 4 | Needed for closed deals and for tidy records. Hidden behind "•••". |
| 14 | **Rename a session** | 6 | 4 | Auto-names from the file are often ugly. You click the title to edit it, which isn't obvious. |
| 15 | **Read two views at once** (split rail) | 5 | 4 | Power users only, for example the transcript next to the scorecard. |
| 16 | **Open the folder in Finder** | 4 | 2 | Power users and curious people. It's in the right-click menu. |
| 17 | **Remove a video or a record** | 4 | 2 | Rare: cleanup, a wrong file, freeing up space. |

### Watch out (low score, high trust risk)
- **W1. Reading the mark as "everything is backed up".** Only the video goes to OneDrive. Notes, transcripts and scores stay on the Mac. A mark that says just "Backed up" invites a wrong belief. See open question Q1.
- **W2. Deleting the local file in Finder because "it's on OneDrive".** A mark shown too early (during "checking") would cause real data loss. Never show `backed_up` before the engine says the file is safe.
- **W3. "Remove video" with OneDrive on.** It removes the video from the Mac **and** from OneDrive (SPEC). Someone who trusts the mark may expect the cloud copy to survive. The confirm wording already covers this, so keep it.
- **W4. Fear at a missing mark.** A new user sees no mark and thinks "is it broken?" This is why `pending` must read as "on its way", never as "failed".

## Deep dives

### 1. Open the newest session
- **Moment:** a weekday, 2–10 minutes after a call ends. At the desk, on a laptop. They just hung up and dropped the recording in.
- **Trigger:** "That went sideways at the pricing part. Let me look."
- **Thoughts:** "Where's the one I just did? Did it import? Is it transcribing yet?"
- **Emotions:** before: wired, a little anxious. During: focused. After: relieved, if it's all there.
- **Expectations:** the screen opens on that call, with zero clicks. The newest call is on top, and its title is readable.
- **Success:** "It's already open. I just press play."
- **Friction and fears:**
  - The heading-size bold glyph on every row is the loudest thing on screen, louder than the title.
  - The date sits above the title as raw `2026-11-20`, so the eye reads digits first.
  - The title wraps or cuts off with no help.
- **Clutter:** the big glyph per row; the raw ISO date on top; the green "reviewed" bar competing with the selected-row background.
- **Product insight:** the row should lead with the title. The date should be small and human ("Today", "Tue 18 Nov"). The outcome should be a small glyph, not a heading.

### 2. Rewatch a moment and jot notes
- **Moment:** the same sitting as #1, or the weekly review. Headphones on.
- **Trigger:** a line in the transcript ("we're not ready to commit"), or a gut feeling about minute 12.
- **Thoughts:** "Click that line — there it is. What should I have said? Write it down before I forget."
- **Emotions:** a small sting at the mistake, then purpose. It feels good when the note is written.
- **Expectations:**
  - Clicking a line jumps the video there right away.
  - Notes save on their own and are always visible.
  - Nothing moves while they type.
- **Success:** "Watch, type, watch, type. The screen stays out of the way."
- **Friction and fears:**
  - The notes box has its own border and a "Notes" placeholder, and nothing tells them it saves.
  - The split rail's coloured badges (QA, CC, SC, TR) pull the eye away from the video.
  - The fear: "Did my note save?"
- **Clutter:** the extra boxes and borders around notes; four coloured bookmark badges always visible while watching.
- **Product insight:** the video, the transcript and the notes are the heart of the screen, so give them the space and calm. The bookmarks can be quieter, as long as they stay one click away.

### 3. Find a past session
- **Moment:** 5 minutes before a follow-up call, or mid-week when a client emails.
- **Trigger:** "What did Acme say about budget last time?"
- **Thoughts:** "Type 'acme'. Which of these three is the right one? The one from October."
- **Emotions:** a bit rushed. Annoyed if the right one isn't obvious.
- **Expectations:** typing filters at once. Rows show who and when in plain words. One click opens it.
- **Success:** "Typed four letters, saw it, clicked it."
- **Friction and fears:**
  - Search only matches the title and the ISO date, not the description.
  - The description is only a hover tooltip on the row, so it's invisible until you hover.
  - Raw dates are hard to scan.
- **Clutter:** the description hidden in a tooltip, while big glyphs take the space a second line could use.
- **Product insight:** the row should make "which call is this?" answerable at a glance: the title plus a human date. Whether the description shows in the row is Jony's call. The research only says it's hidden today.

### 4. Scan the list for outcomes
- **Moment:** whenever the list is visible, often by accident. Also the Friday "how did my week go?"
- **Trigger:** the list is simply there.
- **Thoughts:** "Two won, one lost, one not set yet."
- **Emotions:** pride or a small dip. It shouldn't feel like a report card shouting at them.
- **Expectations:**
  - Outcome colours they can read in a glance, but quietly.
  - A clear "not set yet" state that doesn't look like an error.
  - Reviewed calls look done.
- **Success:** "I can read my week from the list without any noise."
- **Friction and fears:**
  - The glyphs are big and bold, five colours plus a muted one.
  - The "reviewed" mark is a 3 px green bar in a colour outside the core palette (`--color-reviewed`).
  - Each row could end up with three signals (outcome, reviewed, backed up) all fighting for attention.
- **Clutter:** per-row signals that each have their own colour and weight.
- **Product insight:** set a strict order of loudness inside a row: the title, then the outcome glyph, then the reviewed mark, then the backed-up mark (the quietest). The backed-up mark must never be the thing the eye lands on.

### 5. Read one session's scorecard
- **Moment:** after a call, once it has been generated, or in the weekly review.
- **Trigger:** "How did I do on discovery this time?"
- **Thoughts:** "Where's the scorecard? Do I have to generate it? Is it generating?"
- **Emotions:** curious, a bit vulnerable (it's a grade).
- **Expectations:** one obvious place to see it, and one obvious place to generate it.
- **Success:** "One click and I'm reading it."
- **Friction and fears:**
  - **There are two ways to generate a scorecard:** the header island (`onGenerateScorecard`, `hasScorecard`) and the Scorecard view itself (TextView). That is two places for one action, which breaks our "one place per action" rule.
  - A "Generate" button in the header next to the state and reviewed controls reads as a global action, not a per-session one.
- **Clutter:** the duplicate generate-scorecard control in the header.
- **Product insight:** keep generating in the Scorecard view, where the result appears, and drop it from the header. (Eraser checks this.)

### 6. Set the outcome and mark as reviewed
- **Moment:** the end of reviewing a call.
- **Trigger:** "Done with this one. It closed."
- **Thoughts:** "Set Closed. Tick reviewed. Did the closed date fill in?"
- **Emotions:** satisfying. It's closing the loop.
- **Expectations:** two quick controls. The list row updates right away. The closed date fills in silently.
- **Success:** "Two clicks, and the row now looks done."
- **Friction and fears:**
  - The closed date is in MetaPanel behind "•••", so they can't see that it was filled in.
  - The Closed date field is shown even when it's disabled (not won), which is a dead control.
  - The description counter "0/200" is always visible.
- **Clutter:** the "•••" toggle hiding the key facts; the disabled Closed date field; the always-on character counter.
- **Product insight:** show the facts that matter (date, outcome, amount for won calls) quietly as plain text, and edit them where they show. Hide a field when it doesn't apply, rather than greying it out.

### 7. Check that a session is safe on OneDrive (backed up)
- **Moment:**
  - Right after connecting OneDrive.
  - After dropping a big new recording.
  - Before closing the laptop for a trip.
  - When the Mac warns that the disk is full.
- **Trigger:** "If this laptop died tonight, would I lose this call?"
- **Thoughts:** "Is *this one* up there? The line at the bottom says '3 uploading' — but which three? Is today's one done?"
- **Emotions:** a low background worry before. Calm relief after. It should never make them jump.
- **Expectations:**
  - A glance at the row they care about tells them "safe", with no clicks.
  - Hovering says it in words.
  - The summary line at the bottom stays the one place for problems and fixes.
- **Success:** "Tiny check next to it. Good." And they move on without thinking about it again.
- **Friction and fears:**
  - Today there is no per-session signal. The summary line (StorageStatusLine) gives counts only.
  - The fear of a false "safe" (W2).
  - The fear that a missing mark means failure (W4).
  - People who never connected OneDrive don't want to see a cloud anywhere.
- **Clutter:** none yet. The risk is adding some: a badge, a colour, a spinner per row, or a second place that offers fixes.
- **Product insight:** the mark is a quiet **receipt**, not a status light. Rules:
  - It shows only on `backed_up`.
  - It is faint or absent while `pending`.
  - It is completely absent for `not_connected`.
  - It is never a button and never red.
  - Problems keep living in StorageStatusLine, which already opens Settings › Storage.

## What "backed up" means to the user
- **A promise kept:** "A copy of this call's video is safe in my OneDrive. If this Mac breaks, I won't lose the recording."
- **Reassurance, never alarm.** The mark only ever adds calm. It isn't there to warn. Warnings stay in the one summary line, which has the one fix.
- **Only true things.** It appears only once the engine has confirmed the upload. "Checking" is not done (our rule: never show a "safe" signal before it's really true).
- **About the video only.** Notes, transcripts and scores stay on this Mac. The words must not overclaim (Q1).
- **Silence is fine.** No mark means "not yet" or "not using OneDrive". It never means "broken".

## Backup-status contract (everyone builds against this)

```ts
// src/elements/PerformanceReview/PerformanceReview.data.ts
export type BackupState = "backed_up" | "pending" | "not_connected";
// Each session item in the list carries:  backup: BackupState
export function toBackupState(raw: RawBackup): BackupState;
```

- `toBackupState(raw)` is the **only** place in Performance Review that reads Uncle Bob's per-session storage status. No element reads `VideoState` itself.
- **What exists today.** `getStorageOverview()` / `useStorageOverview()` in `src/lib/onedrive/`, backed by the Tauri command `storage_overview`, which refreshes on `storage://changed`. It returns `connected` and `videos: VideoStatus[]`, with `{ spaceId, recordId, state }` for each one. That is the per-session status, so no new backend field is needed.
- **Suggested raw shape** (Jony may adjust it to whatever Uncle Bob ships, changing only this function):
  `RawBackup = { connected: boolean; video: VideoStatus | undefined }`, where `video` is the entry matching this record's `spaceId` and `recordId`. The lookup lives next to `toBackupState`, in the same file.
- **Mapping:**

| Raw | BackupState | Why |
|---|---|---|
| overview missing, or `connected === false` | `not_connected` | Not using OneDrive, so show nothing. |
| connected, but this record has no video entry (no video, or the engine hasn't seen it yet) | `not_connected` | Nothing to back up, so show nothing. (A: better silent than a false "pending".) |
| `safeOnMac`, `inCloud` | `backed_up` | The engine confirmed a safe copy in OneDrive. |
| `waiting`, `uploading`, `checking`, `paused` | `pending` | On its way. Not safe yet. |
| `notUploadedFull`, `notUploadedUnreadable` | `pending` | Not safe. The problem and its fix stay in StorageStatusLine, not the row. |
| `missing` | `pending` | The cloud copy is gone, so it's no longer safe. Never claim `backed_up`. |

- Signed out or revoked: the copies already uploaded are still in OneDrive, so `safeOnMac` and `inCloud` stay `backed_up`. New uploads stay `pending`.
- Labels (from the brief): `backed_up` → "Backed up to OneDrive"; `pending` → "Not backed up yet"; `not_connected` → no label, no element.

## Key insights
1. **Calm the list first.** It's the entry point for 6 of the top 7 behaviors. The title leads. The date is human. The glyph is small. The signals inside a row follow a strict order of loudness, with the backed-up mark the quietest.
2. **One place per action.** Drop the header's generate-scorecard control, and keep the one in the Scorecard view.
3. **Show the facts, don't hide them behind "•••".** Date, outcome and amount are what people check. A field that doesn't apply should be absent, not disabled. The always-on 0/200 counter is noise.
4. **Protect the video, transcript and notes area.** That is where the real job happens. The bookmarks can be quieter.
5. **Backed up is a receipt.** It's tiny, only true, silent for non-users, and never a second place for problems.

## Open questions
- **Q1 (wording, for Jony and Merlin):** the brief's label is "Backed up to OneDrive", but only the video is backed up (W1). Should the label be "Video backed up to OneDrive"? My recommendation: yes, for the aria and hover text; the mark itself stays a glyph.
- **Q2:** should `pending` show a faint mark or nothing at all? The research leans to **nothing**: fewer marks, and it avoids W4. A faint mark is fine only if it clearly reads as "on its way".
- **Q3:** should the description become a visible second line in the row (it helps #3), or stay a tooltip? That's Jony's call.
- **Q4:** the header island is outside `src/elements/PerformanceReview/**`, but this screen sets it up through `setIsland`. Removing the scorecard action there may touch `AppHeader`. That's for the captain to OK.
