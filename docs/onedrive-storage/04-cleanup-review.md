# OneDrive storage: clutter review

Author: Eraser (Step Eraser) · 2026-11-25 · Reviews: `03-ui-spec.md` (Jony) against `01-research.md` (Columbo) and `02-magic.md` (Merlin) · Result: `SPEC.md`

Labels: **#n** = research behavior, **Dn** = deep dive, **Wn** = watch-out item, **M1–M5** = Merlin's Moments.

## 1. The goal

> The user wants their call videos safe and their Mac light, and wants to play any video with one click, without thinking about where it lives.

## 2. Verdict

**APPROVED after these changes.** 03 was already lean. Jony had removed the pre-sign-in mode picker, per-row account buttons, the quit dialog and the second glyph. I found one dead end, one claim that isn't true, two duplicate signals, one copy slip and one gap against the watch-out list. All are fixed in `SPEC.md`. None of them adds a step to the common path.

## 3. Step counts (main flows)

| Flow | How often (research) | Steps in 03 | Steps in SPEC | Notes |
|---|---|---|---|---|
| Play a video (#1) | every session | 1 (click) | 1 | Same in every mode. Streaming adds a label, not a step. |
| Never connect (#2) | every session | 0 | 0 | No storage UI outside Settings. |
| Add a video (#3) | daily | 0 extra | 0 extra | Upload runs in the background. |
| "Is it safe?" (#4) | daily | 1 glance | 1 glance | Status line or row glyph. |
| Connect (#10, #11) | once | 6 | 6 | 1 Settings · 2 Storage · 3 Connect OneDrive · 4 pick account · 5 password / MFA · 6 consent. The app returns to the front by itself and Backup is pre-selected. Steps 4–6 are Microsoft's, so they can't be cut. |
| Free space (#17) | once | Connect + 2 | Connect + 2 | 7 pick Smart · 8 confirm. **Keep the confirm:** it moves many videos off the Mac (W9, data). |
| Switch modes (#22) | rare | 4 | 4 | Settings · Storage · pick · confirm. When nothing moves, the confirm is skipped (3). |
| Fix "OneDrive full" / "Signed out" | rare | 3 | 3 | Click status line · fix button · Microsoft page. |
| Fix "a video couldn't be read" | rare | **5 + a dead end** | **2** | See C1. |
| Disconnect (#24) | rare | 4 | 4 | Settings · Storage · Disconnect · confirm. The confirm protects data (W7). |
| Remove a video / record (#12) | sometimes | existing + 0 | existing + 0 | New copy only, no new step. |

## 4. Findings and changes

Each line: what's wrong · the call (Keep / Cut / Merge / Automate / Defer) · what SPEC.md does.

### C1 · Dead end for "a video couldn't be read" · **Merge**
In 03, the status line shows *1 video not uploaded* (accent), and clicking the status line opens Settings › Storage. But Settings has nothing about it. The fix was **Upload again** in the row's right-click menu. So the user clicks, lands on a page with no answer, goes back, finds the row among 200, right-clicks it and picks Upload again. That's 5 steps with a dead end, and the user has to guess that right-click is where the fix lives.
**SPEC:** a new rule: *every accent state has its one fix in the Settings problem notice.* "Couldn't be read" becomes a notice with **Try again**, and the row's **Upload again** menu item is cut. The flow is 2 steps: click the status line, then Try again. Rows now add no menu items at all.

### C2 · "Missing in OneDrive" was never in the status line · **Gap (W2)**
A video that is missing in OneDrive and not on this Mac is real loss, but the status line could still read *All 214 videos safe in OneDrive*. That's false and breaks the main trust signal (D4).
**SPEC:** added to the status line (accent) and to the problem notice, with plain text and no button. Its fix is the existing Remove video menu item, if the user wants it. "All N safe" is shown **only** when every video really is safe.

### C3 · The quit tooltip said something untrue · **Fix copy (D6)**
03 says *"Uploads continue on their own, even if you quit or close the lid."* They don't. Uploads pause and pick up next time the app is open and online. That's hidden confusion: the user closes the lid thinking it's done.
**SPEC:** *"If you quit or close the lid, uploads pause and pick up where they left off next time. Nothing leaves this Mac until it's safe."* Section 1's decision row was corrected to match.

### C4 · "First up" line duplicates the numbers line · **Merge**
After connecting, the Connected panel showed a *First up: 37 videos · 12.4 GB…* line **and** the numbers line under the modes. That's two lines about the same upload queue, and one of them has its own "until the queue is empty" lifecycle to build and test.
**SPEC:** cut the First up line. One rule for the numbers line: *while anything is moving, it shows the movement* (first upload, normal uploads, mode switch, disconnect). Otherwise it shows the totals. Proof that it started (D8) is still there, live, on the same screen. "Nothing leaves this Mac until it's safe" is already in the mode lines and every confirm, and Backup (the default) never removes anything anyway.

### C5 · "2 uploads finished since you last looked" · **Cut**
A timed state (10 s) that pushes out the real state. "All 214 videos safe in OneDrive" already answers the question the careful keeper has on reopening, and it's always true. The extra line means one more state, one timer and one more string, and it gives no new meaning. Merlin folded it in as a nice touch. It fails the "still fine the 100th time" test, because it's noise every morning.
**SPEC:** cut. The status line has one fewer state, and the checklist has one fewer row.

### C6 · Two words for the same OneDrive-full state · **Fix copy**
In 03 the status line says *3 videos waiting on this Mac* while the rows say *Not uploaded*. "Waiting" is the word for the calm, muted state. Using it for an accent problem mixes the two colour meanings.
**SPEC:** the status line reads *OneDrive is full · 3 videos not uploaded*. The row tooltip adds where to fix it: *Make room in Settings › Storage.*

### C7 · "in the cloud" in user copy · **Fix copy (vocabulary)**
The not-connected panel body says *"keep a copy safe in the cloud"*. The vocabulary rule says "in OneDrive", never "cloud" in text.
**SPEC:** *"keep a copy safe in OneDrive"*. The one allowed exception is the mode name **Always in cloud**, which comes from the goal. It is now written down as the only exception. "Download" is allowed as a verb (*download back to this Mac*), never as a place name ("downloaded").

### C8 · Smart "bring it home" could refill the disk · **Gap (W4)**
Watching an old Smart video downloads it in the background. On a nearly full Mac, that's the exact OneDrive-on-Mac complaint (space quietly filling up again).
**SPEC:** a guard: bring a video home only if, after the download, free space stays above 10% of the disk and above 5 GB. Otherwise it just streams, the 14-day timer is not reset, and nothing is shown. Uncle Bob may tune the numbers but not drop the guard.

### C9 · "Switching while offline: applies at once" read as "no confirm" · **Fix wording**
03 has a table row saying offline switches "apply at once" and also "the sheet adds one line". That's contradictory.
**SPEC:** the confirm sheet still shows when videos will move. Confirming sets the mode, and the moves start when the app is back online.

## 5. Checked and kept (defended steps)

| Step / element | Why it stays |
|---|---|
| Mode-switch confirm sheet | Moves or downloads many videos at once (W9). Data and disk space. Skipped when nothing moves. |
| Disconnect confirm (4 variants) | The only moment the last reachable copy could be cut off (W7). |
| "Disconnect anyway" + stranded state | Needed when the account is gone (left the job, org revoked access). Without it the user can never disconnect. Rare path, so extra states are fine. |
| **Cancel** while waiting for sign-in | The user may close the browser tab. Without Cancel the panel is stuck. |
| "Stop disconnecting" | It's undo instead of an "are you sure?". Good pattern. |
| Wrong-account notice | Prevents mixing two libraries silently. |
| "For all Spaces." micro line | One line of reading. It prevents the wrong belief that storage is per Space. |
| Status line → Settings | Navigation, not a second copy of an action. Settings is a separate page (`src/app/settings`), so the list needs a way to get there. The Settings rail is the other way in, as for Profile and Score. |
| `Video is in OneDrive.webloc` (M4) | Kept on purpose: an empty record folder looks like a deleted call (W14). |
| "Brought home" glyph flip | Kept on purpose, with no motion. The glyph changes because the place really changed (D7). Now guarded by C8. |
| Ring + 150 ms check settle (M1) | The only motion. It *is* the receipt, it's driven by real confirmation and it's off with reduced motion. |
| Smart tooltip "On this Mac until 9 Dec" | Answers "when will it go?" only when asked. No row badges. |

## 6. Coverage check against the research

**Top behaviors (#1–#9):** all covered. #5 Drill burst is out by decision (takes are out of scope; the Training Room gets no storage UI), which protects drill flow.
**Other behaviors:** #10–#24 all have a place. #23 (second Mac) has no screen on purpose. SPEC bans "sync" and makes no cross-Mac claims.

| Watch out | Where SPEC.md covers it |
|---|---|
| W1 remove before confirmed | §7 rule 1, §6.1 motion (check only on receipt) |
| W2 losing the only copy | §6.1 Missing state, §6.2 status line, §5.6 notice (C2) |
| W3 offline cloud-only | §6.1 dimmed rows before the click, §6.2, §7 |
| W4 full Mac disk | Backup hint "Doesn't free up space", Always-in-cloud buffer cleared, bring-home guard (C8) |
| W5 OneDrive full | §5.6, §6.2, §7 rule 4 |
| W6 signed out ≠ offline | §6.2 accent vs muted, §5.6, separate row label |
| W7 disconnect | §5.7 |
| W8 delete | §6.3 confirm copy |
| W9 switching | §5.5 |
| W10 confidentiality | §5.2 micro line (only videos), §5.4 account block (which account, which folder) |
| W11 tampering | §8 (track by item, not path) |
| W12 second Mac | §3 (no "sync") |
| W13 re-transcribe | §6.4 |
| W14 empty Finder folder | §8 `.webloc` |

## 7. Watch later

- **Status line noticed?** Jony's check (ask three users "is your last call backed up?") is the real test of the one-place summary. If people miss it, move it, but don't add a second one.
- **The quit moment** lives only in a tooltip. If testing shows careful keepers still worry at lid-close, put it in visible text on the status line while uploading. Still no quit dialog.
- **One glyph for two questions** (check vs cloud). If testing fails, add the place mark back as a *tooltip line*, not a second glyph.
- **New problems** must follow the rule from C1: accent on the row, a line in the status line, one fix in the Settings notice. No row buttons.
