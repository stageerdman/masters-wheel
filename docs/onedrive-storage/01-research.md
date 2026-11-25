# OneDrive storage — user-behavior research (MVP)

Author: Columbo (UX Detective) · 2026-11-25 · Read by: Merlin (02-magic), Jony (03-ui-spec), Eraser (04/SPEC)

## Summary

People will not "use OneDrive" in Master's Wheel. They will use the app to
**review calls and drill**, and the storage feature is something they hire
for one quiet job: **"Keep my recordings safe and keep my Mac from filling
up — without making me think about it."**

Three things follow from that:

1. **Playing a video must feel the same whatever mode is on.** The most
   common behavior by far is "click a video and watch it". If storage ever
   gets in the way of that (a spinner, a "download first", a dead player
   offline with no warning), people blame the whole app.
2. **"Is it safe yet?" is the one question the status must answer.** People
   glance at a video's status right after adding it, and before they close
   the laptop. They need a clear, honest *safe / not yet safe* — not four
   technical states of equal weight.
3. **The app must never remove the last good copy.** Every real fear in this
   area (lost video, deleted before upload, offline with nothing to play)
   comes from one root: the user can't tell where the only copy lives.
   Local copies may leave the device only after the cloud copy is confirmed.

Connecting is a once-in-a-lifetime moment (high stakes, low frequency). Most
users will either never connect, or connect once and then forget the
feature exists — which is the goal.

## Context I used

- Master's Wheel is a local-first macOS app. "Videos" today are mostly
  **call recordings** (`hero.<ext>` in each record folder, often 30–90 min,
  hundreds of MB to several GB) plus **Frame Drills takes** (short `.m4a`
  audio files, many per session). Records are real Finder-visible folders
  under `~/Documents/Master's Wheel/<Space>/records/<id>/`.
- Transcription and re-transcription read the **local** hero file (ffmpeg).
- Today nothing leaves the Mac except audio sent to ElevenLabs for
  transcription.
- How people live with similar products today (OneDrive Files On-Demand,
  iCloud "Optimize Mac Storage", Google Photos/Drive backup):
  - The top complaint about OneDrive Files On-Demand on Mac is confusion
    about **where a file actually is** — the cloud/check icons are read as
    unclear, and "Free up space" sometimes doesn't visibly free space or
    files come back. Microsoft's own moderators called this "a top source
    (if not the top source) of user confusion".
  - A well-known risk: a file *looks* present but is cloud-only, and the
    user only finds out when offline or when the cloud copy is gone.
  - People trust backup when they can **see one simple "done" signal**
    (Photos' "Backup complete", a green check), not a log.

## Scope

**In (MVP):**
- Connecting a OneDrive account — optional; the app works fully without it.
- Choosing exactly one mode:
  - **Backup** — every video stays on the Mac *and* a copy goes to OneDrive.
  - **Always in cloud** — videos live in OneDrive; the Mac keeps no lasting copy; playback streams.
  - **Smart** — videos added or watched in the last 14 days stay on the Mac; older ones live only in OneDrive.
- Per-video status: **on device · uploading · in cloud · streaming**.
- Being offline (no network, or OneDrive unreachable).
- Errors that come with the above: full OneDrive, failed upload, signed-out account.
- Switching mode and disconnecting (because they change where videos live).

**Out (and why):**
- Sharing videos or links from OneDrive — a different job (collaboration), not storage.
- Multiple OneDrive accounts, or one account per Space — rare for a solo coaching tool; adds a mental model ("which account is this video in?") the MVP doesn't need.
- Other clouds (iCloud, Google Drive, Dropbox) — one provider first; learn from it.
- Per-video "always keep on this Mac" pinning — real wish (see open questions), but Smart's 14-day rule covers most of it; leave out until people ask.
- Syncing between two Macs / restoring onto a new Mac — needs its own research (conflicts, Spaces, records metadata). Listed under watch-out because people *will* assume it.
- Storing notes, transcripts, scorecards in OneDrive — the goal is videos only.
- Changing the 14-day window — one fixed number keeps Smart explainable.
- Bandwidth limits / "upload only on Wi-Fi" settings — power-user knobs; macOS laptops are almost always on Wi-Fi.

## Who I pictured

- **Busy rep** — records a call, drops it in, wants the transcript and scorecard, moves on. Never opens Settings.
- **Coach with a full Mac** — 256 GB MacBook Air, 200 call videos, "Your disk is almost full" warnings. The main reason this feature exists.
- **Careful keeper** — afraid of losing a great call; wants a backup and wants to *see* it's backed up.
- **Commuter / traveller** — reviews calls on the train or a plane, often offline.
- **Driller** — records 10–30 Frame Drills takes per session, listens back right away.
- **Company laptop user** — signs in with a work Microsoft account; may have rules about client recordings leaving the device.

## Behavior table

Scores 1–10. L = how likely real users are to do it. F = how often. Sorted by L+F.
When unsure I chose the lower score.

| # | Behavior (label) | L | F | Sum | Reason |
|---|---|---|---|---|---|
| 1 | **Just play it** — click a video and expect it to play | 9 | 9 | 18 | Watching calls is the core of the app; happens every session, many times. |
| 2 | **Never connect** — use the app with no OneDrive at all | 8 | 9 | 17 | Many users have no OneDrive or don't care; they use the app daily and must never feel nagged or "incomplete". |
| 3 | **Drop and go** — add a video, then keep working or leave while it uploads | 9 | 8 | 17 | Adding calls is the main input; nobody waits for an upload bar. |
| 4 | **Is it safe yet?** — glance at a video's status to check it's backed up | 8 | 7 | 15 | Careful keepers check after each new video and before closing the lid; others only when something feels off. |
| 5 | **Drill burst** — record many short takes in a row and listen back | 7 | 7 | 14 | Frame Drills users make dozens of small takes per session; each one would get a status. |
| 6 | **Close the lid mid-upload** — quit, sleep or lose Wi-Fi while uploading | 8 | 6 | 14 | Big call videos take minutes to upload; laptops get closed constantly. |
| 7 | **Rewatch an old call** — open a video older than 14 days (Smart) or any video (Always in cloud) and it streams | 7 | 5 | 12 | Coaches return to old calls for comparison or examples; less often than new ones. |
| 8 | **Jump around a streaming video** — click transcript timestamps / scrub while streaming | 6 | 5 | 11 | Review means seeking, not playing start to end; only matters when streaming. |
| 9 | **Offline review** — open the app on a train/plane and review calls | 6 | 4 | 10 | Real for commuters/travellers; most work happens online. |
| 10 | **Connect once** — connect OneDrive in Settings | 7 | 1 | 8 | Most likely triggered by a disk-full warning or fear of loss; done once. |
| 11 | **Pick a mode** — choose Backup / Always in cloud / Smart when connecting | 7 | 1 | 8 | Comes right after connecting; done once, rarely revisited. |
| 12 | **Delete a video or record** — and wonder whether it's gone from OneDrive too | 6 | 2 | 8 | Removing records happens; the cloud question comes with it every time. |
| 13 | **Where did my disk space go?** — check how much is on the Mac vs in the cloud | 5 | 3 | 8 | Coach with a full Mac checks after connecting and when warnings return. |
| 14 | **Signed out surprise** — the account expires or the password changes | 6 | 2 | 8 | Microsoft tokens expire / passwords change; this happens to users, not by them. |
| 15 | **Add a video offline** — expect it to upload later | 5 | 3 | 8 | Recording a call in a place with bad Wi-Fi, then dropping it in. |
| 16 | **Re-transcribe or rescore an old video** — when the file is only in the cloud | 5 | 2 | 7 | Re-transcribe exists today and needs the local file. |
| 17 | **Free space now** — switch to Always in cloud or Smart to fix a full disk | 6 | 1 | 7 | Triggered by a disk warning; one-off. |
| 18 | **Look in Finder** — open the record folder and expect the video file there | 4 | 3 | 7 | Records are Finder-visible today; some users share or copy files from there. |
| 19 | **OneDrive fills up** — quota runs out (free plan is only 5 GB) | 5 | 2 | 7 | A few hour-long calls fill a free plan; Microsoft 365 users (1 TB) rarely hit it. Lowered from 6 because many users have 365. |
| 20 | **Look in OneDrive itself** — open OneDrive web/Finder to find, rename or move the videos | 5 | 2 | 7 | Curious or tidy users will look; renaming/moving there may break the app's link. |
| 21 | **Work-account sign-in** — sign in with a company Microsoft account | 5 | 1 | 6 | Common for sales teams; sign-in screens differ and IT may block it. |
| 22 | **Switch modes later** | 4 | 1 | 5 | Most people pick once; a few change after seeing the effect. |
| 23 | **Expect videos on a second Mac** — install on another Mac and expect videos to appear | 4 | 1 | 5 | Normal cloud intuition ("it's in OneDrive, so it's everywhere"), but out of scope. |
| 24 | **Disconnect** — remove OneDrive from the app | 3 | 1 | 4 | Rare (leaving a job, privacy worry, switching account). High stakes in cloud-only modes. |

## Deep dives

The behaviors with both scores ≥ 7 are #1–#5. I added three lower-frequency
behaviors (#6, #7+#8 merged, #10+#11 merged) because a bad experience there
breaks trust in a single moment.

### D1 · Just play it (#1, L9 F9)

- **Moment:** Any time, mostly workday afternoons after calls. At the desk, Mac, often with the call's notes open beside it. Just before: they finished a call, or a manager asked "how did the Acme call go?".
- **Trigger:** They want to see a moment in a call — a quote, an objection, their own tone.
- **Thoughts:** "Where was that bit where she pushed back on price…" — they think about the *call*, never about storage.
- **Emotions:** Before: focused, slightly impatient. During: absorbed. After: satisfied, or annoyed if they had to wait.
- **Expectations:** Click → it plays within ~1 second, like a local file. Same player, same controls, whatever mode.
- **Success:** They never notice where the video came from.
- **Friction and fears:** A spinner with no reason; a "download first" step; a video that plays locally one day and buffers the next with no explanation; a status icon that suddenly looks like a warning.
- **Product insight:** Storage state should be **silent at play time** when it plays fine. Streaming is a *fact to show quietly*, not a step to take. If a video can't play (offline + cloud-only), say so *before* the click, on the list row, not after.

### D2 · Never connect (#2, L8 F9)

- **Moment:** Every session, for a large share of users who have no OneDrive, a personal policy against cloud, or simply no need.
- **Trigger:** None — this is the absence of a trigger. The risk is the app creating one (badges, banners, "Your videos aren't backed up!").
- **Thoughts:** "I just want to review my calls." / "I don't want my client calls in Microsoft's cloud."
- **Emotions:** Neutral. Turns to irritation or guilt if nagged; to worry if the app hints their videos are "at risk".
- **Expectations:** Everything works exactly as it does today. Videos are simply on the Mac.
- **Success:** They don't know the feature exists unless they open Settings.
- **Friction and fears:** Upsell banners; a "not backed up" status on every row; a status column full of the same "on device" label that tells them nothing.
- **Product insight:** When not connected, **show no per-video storage status at all** (or nothing that reads as a warning). Connecting lives in Settings only. *Assumption:* the user brief "connecting is optional" means no first-run prompt.

### D3 · Drop and go (#3, L9 F8)

- **Moment:** Right after a sales call, at the desk; or end of day, adding several recordings at once. Just before: they exported the recording from Zoom/Teams and dragged it in.
- **Trigger:** A new recording exists and they want the transcript and scorecard.
- **Thoughts:** "Drop it in, let it transcribe, I'll look later." They are thinking about transcription, not upload.
- **Emotions:** Before: busy. During: they've already moved on. After: calm *if* they trust it continues on its own.
- **Expectations:** The video is usable (playable, transcribing) immediately — upload happens in the background, never blocks playback or transcription. Progress is visible if they look, but they shouldn't have to.
- **Success:** Next time they look, it's "in the cloud" without them having done anything.
- **Friction and fears:** Being made to wait for upload before playing/transcribing; two progress bars (transcription + upload) competing on the same row with no labels; not knowing whether quitting stops it.
- **Product insight:** A new video always starts **on device and fully usable**; upload is a background job. In every mode, including Always in cloud, the local copy must stay until upload is confirmed. Transcription progress and upload progress must be clearly distinguishable.

### D4 · Is it safe yet? (#4, L8 F7)

- **Moment:** Two moments: (a) a minute after adding a video they care about ("that was a great call, I'm keeping it"); (b) end of day, before closing the lid.
- **Trigger:** A flash of worry. Often caused by an earlier loss (a dead laptop, a lost phone) — this is the "careful keeper".
- **Thoughts:** "Did it go up? Can I close this now? If my Mac died tonight, would I still have it?"
- **Emotions:** Before: a small anxiety. During: scanning. After: relief, or a nagging doubt if the signal is unclear.
- **Expectations:** One glance at the row tells them *safe* or *not yet*. If not yet: why, and whether it will finish by itself.
- **Success:** A clear, calm "safe" signal they believe. Ideally also a single place that says "all videos are safe" so they don't check rows one by one.
- **Friction and fears:** Four equal-weight icons they must decode (the OneDrive-on-Mac confusion in a new place); "in cloud" meaning both "backed up" and "only in the cloud" without telling which; a check mark that appears before upload is actually confirmed.
- **Product insight:** The status must answer two separate questions, and the UI should keep them apart: **Is it safe in the cloud?** (yes / not yet / failed) and **Can I play it here without internet?** (on this Mac / cloud only). "On device / uploading / in cloud / streaming" mixes those; the spec needs to make sure e.g. a Backup-mode video reads as *both* "on this Mac" and "safe in the cloud". *Assumption:* "streaming" is the playback state of a cloud-only video, not a stored state.

### D5 · Drill burst (#5, L7 F7)

- **Moment:** A dedicated practice block, 20–30 min, at the desk with a mic. Takes every 30–90 seconds.
- **Trigger:** They want to hear how they sounded on that last try.
- **Thoughts:** "Again. Again. That one was better — play it back."
- **Emotions:** Focused, a bit self-conscious; the app should feel invisible.
- **Expectations:** Instant playback of the take just recorded. Nothing else moves on screen.
- **Success:** Flow is never broken.
- **Friction and fears:** Status icons flickering through "uploading → in cloud" on every small take, pulling attention; a take that won't play because it went to the cloud.
- **Product insight:** Small takes go up quietly; any status change on a take should be calm (no motion that pulls the eye mid-drill). Smart's "added in the last 14 days" keeps recent takes local, which matches the drill rhythm. **Open question:** are Frame Drills takes (audio) in scope at all, or only call videos? The goal says "uploaded videos" — *assumption:* the MVP covers record videos (`hero.<ext>`); takes are included only if Columbo/Jony decide so. Either way, this behavior says: don't let storage noise into the drill.

### D6 · Close the lid mid-upload (#6, L8 F6)

- **Moment:** End of the day, 6 pm, a 2 GB call still uploading at 40%. Or a commuter grabbing the laptop to catch a train.
- **Trigger:** Life — leaving the desk.
- **Thoughts:** "Will this break it? Do I need to wait? Will I have to start over?"
- **Emotions:** Before: hurried. During: slight guilt or worry. After: relief when next morning it's done — or alarm if it says "failed".
- **Expectations:** It just picks up where it left off next time the app is open and online. Nothing is lost; at worst it's late.
- **Success:** The next morning the row says safe, with no action from them.
- **Friction and fears:** A "failed" state after a normal sleep; uploads starting from 0% again; in Always in cloud mode, the local copy being gone while the upload never finished.
- **Product insight:** An interrupted upload is **paused, not failed**. Uploads resume on their own. "Failed" is reserved for something the user must act on (full OneDrive, signed out, file unreadable). If the app quits with uploads pending, the user may need one honest line (e.g. on quit or on next open) — Jony decides where, but it must exist.

### D7 · Rewatch an old call (#7 + #8, L7 F5 / L6 F5)

- **Moment:** Preparing a coaching session or a similar deal: "Show me how I handled this objection in October." Desk, Mac, usually online.
- **Trigger:** A new situation reminds them of an old call.
- **Thoughts:** "I know it's in here somewhere… there, jump to the timestamp."
- **Emotions:** Curious, purposeful. Frustration grows fast if seeking stutters.
- **Expectations:** It plays like a recent one, perhaps with a second of buffering. Clicking a transcript timestamp jumps there.
- **Success:** They forget it was streaming.
- **Friction and fears:** Long buffering on every seek; not knowing why this video is slower than yesterday's; finding out on a plane that it can't play.
- **Product insight:** Streaming must support seeking (transcript timestamps are a core feature). Watching an old video in Smart should make it "recently watched" again (keeps it 14 more days) — *assumption, to confirm*: does it download a local copy when watched, or only stream? People will expect "I watched it, so now it's here".

### D8 · Connect once and pick a mode (#10 + #11, L7 F1)

- **Moment:** Evening or a quiet moment, after a macOS "disk almost full" warning, or after a scare ("my colleague's laptop died"). At the desk.
- **Trigger:** A disk-space problem (coach with a full Mac) or fear of loss (careful keeper). These two triggers map almost exactly onto two modes: fear → Backup; full disk → Smart / Always in cloud.
- **Thoughts:** "Is this safe for client calls? Which one do I pick? What happens to the 200 videos I already have? Will it delete anything?"
- **Emotions:** Before: worried or annoyed. During: cautious, reading every word. After: relief and a desire to *see* it working.
- **Expectations:** Standard Microsoft sign-in in the browser or a sheet; back in the app in under a minute; one clear choice with a sensible default; immediate visible effect (existing videos start going up).
- **Success:** "Done — my videos are going up, and I know what will happen to them."
- **Friction and fears:** Mode names that need a manual; not knowing what happens to existing videos; a mode that deletes local copies right away; a work account that silently fails; not knowing where in OneDrive the videos go.
- **Product insight:** The choice must be explained by **what happens to my videos on this Mac**, in one line each. The default should be the safest (*recommendation for the team: Backup*, because it never removes a local copy). After choosing, existing videos are uploaded first; nothing local is removed until each one is confirmed in the cloud. Tell people the OneDrive folder name so they can find it.

## Watch out — trust and harm risks

These may score low, but any one of them can lose a video or the user's trust for good.

1. **Removing a local copy before the upload is confirmed.** In Always in cloud and Smart, the Mac copy may only go after OneDrive confirms the full file (size/hash check). Never on "upload started".
2. **Losing the only copy.** If the cloud copy is deleted (in OneDrive web, by quota cleanup, by account loss) and the Mac has none, the video is gone. The app should notice a missing cloud file and say so, not show a broken player.
3. **Offline when you need a cloud-only video.** The list must show *before the click* which videos can't play right now. No surprise on the plane. (Behavior #9, L6 F4.)
4. **Full Mac disk.** Backup mode does nothing for space — a user who picked it to "free space" will be disappointed. Also: streaming/caching must not quietly fill the disk again (the exact OneDrive-on-Mac complaint).
5. **OneDrive quota full.** Uploads stop. Must be one clear, persistent message with what it means ("new videos stay on this Mac only") — and in Always in cloud, local copies must stay because they're the only ones.
6. **Signed out / token expired.** Uploads pause; cloud-only videos become unplayable. Must look different from "offline" so the user knows they need to sign in again, not wait.
7. **Disconnecting while videos are cloud-only.** The user must be told how many videos live only in OneDrive and what happens to them (stay in OneDrive? downloaded back first?). Never leave records pointing at videos the app can no longer reach without saying so.
8. **Deleting a video or record.** People will ask "is it deleted from OneDrive too?". Whatever the answer, it must be stated at the moment of deletion. Silent leftovers fill the quota; silent cloud deletion surprises people who thought OneDrive was their backup.
9. **Switching modes.** Going to Always in cloud/Smart removes many local copies at once (after upload); going to Backup downloads them all back (needs disk space and time). The user must see the consequence before it happens.
10. **Client confidentiality.** Recordings of client calls may not be allowed in a personal cloud. Not our decision to make for them, but the connect moment should make clear *which account* and *what* is uploaded (videos only — *assumption*, matching the goal).
11. **Tampering in OneDrive.** Renaming or moving the files in OneDrive itself may break the link. The app should cope or say so clearly.
12. **Second Mac expectation.** Users may assume their library appears on another Mac. It won't in the MVP; say nothing misleading like "synced".
13. **Re-transcribe on a cloud-only video.** It needs the file locally — the app must fetch it (and say so), not fail.
14. **Finder shows an empty record folder.** For cloud-only videos the `hero` file is gone from Finder. Users who browse Finder may think it was deleted.

## Key insights

1. **The job is "keep my calls safe and my Mac light, without thinking about it."** Every screen should be judged by how little attention it takes.
2. **Playing is sacred.** Storage must never add a step to playing. Problems are shown before the click, on the row.
3. **Two questions, not four states.** Users ask "is it safe?" and "can I play it here (offline)?". The four states must map clearly onto those two answers.
4. **Paused is not failed.** Normal life (sleep, Wi-Fi drops) pauses uploads. "Failed" means "you need to do something", and says what.
5. **The last copy is untouchable.** Local copies leave only after a confirmed upload; this rule is the backbone of trust in all three modes.
6. **Not connected = no storage UI.** Users who never connect should see exactly today's app.
7. **The two triggers for connecting map to modes.** Fear of loss → Backup. Full disk → Smart / Always in cloud. Mode descriptions should speak to those two needs.
8. **Calm, not chatty.** Status changes (especially for many small takes) should be quiet; drama only for real problems.

## Open questions (for Columbo / Jony to decide)

1. Are Frame Drills takes in scope, or only record videos (`hero.<ext>`)? *My assumption:* record videos only for the MVP.
2. Smart mode: does *watching* an old cloud-only video download a local copy for 14 days, or just stream and reset the timer? People will expect "watched → now on my Mac".
3. What does deleting a video/record do in OneDrive (delete too, or keep)? *Recommendation from behavior:* delete it too, and say so in the delete confirm.
4. What happens to cloud-only videos on disconnect — download back first, or leave in OneDrive?
5. Which mode is the default? Behavior points to Backup (safest), but the disk-full user needs Smart.
6. Personal and work (OneDrive for Business) accounts both? *Assumption:* both, via standard Microsoft sign-in; work accounts may be blocked by IT and need a clear error.
7. Is one account per app (not per Space) right? *Assumption:* one account for the whole app; videos keep their Space folder structure inside one OneDrive app folder.
8. Should the app show a single "all videos safe / N waiting" summary somewhere, so careful keepers don't check rows? (D4 says yes — Jony decides where.)

## Assumptions (all in one place)

- "Videos" = record videos (`hero.<ext>`) for the MVP; Frame Drills takes are an open question.
- Connecting is never prompted at first run; it lives in Settings.
- "Streaming" is how a cloud-only video plays, not a stored state.
- Only videos go to OneDrive — not notes, transcripts or scorecards.
- One OneDrive account for the whole app.
- Scores are reasoned estimates from the product context and from how people use OneDrive, iCloud and Google Photos today; there were no user interviews. Treat them as a ranking, not data.

## Sources

- Microsoft Q&A: "Files On-Demand status on OneDrive for Mac is confusing" — https://learn.microsoft.com/en-us/answers/questions/5789721/files-on-demand-status-on-onedrive-for-mac-is-conf
- Microsoft Tech Community: Files On-Demand for macOS Q&A (moderator: "a top source of user confusion") — https://techcommunity.microsoft.com/discussions/onedriveforbusiness/files-on-demand-for-macos-qa/3101140/replies/3106729
- Microsoft Q&A: OneDrive uses system drive storage even with Files On-Demand — https://learn.microsoft.com/en-us/answers/questions/5350767/mac-os-onedrive-uses-up-system-drive-storage-even
- Ask Leo: How Files On-Demand affects recovering OneDrive files — https://askleo.com/how-files-on-demand-affects-recovering-onedrive-files
- Microsoft Support: Save disk space with OneDrive Files On-Demand — https://support.microsoft.com/onedrive/save-disk-space-with-onedrive-files-on-demand-for-windows
- Project context: `CLAUDE.md`, `FEATURES.md`, `updates/2026-11-16 FRAME-DRILLS - OPEN/update v1.md`
