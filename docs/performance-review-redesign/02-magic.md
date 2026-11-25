# Performance Review: the few quiet moments (magic)

Author: Merlin (Magic Director). Phase 2 of `00-roadmap.md`.
Reads: `01-research.md` and `principles/magic-ux/how-we-work.md`. Jony builds these; Eraser checks them.

## The feeling we're after
The person arrives a bit wired from a call ("let me catch what went wrong"), or calm on a Friday going through the week. Either way, the screen should feel like a **quiet desk**. Things on it don't move unless something has really changed, and when they do change, they **settle** into place the way ink dries on a page. They never pop.

## The world (one idea, used in every moment)
**"Things that become true settle in."**
- Ink that is still wet hasn't happened yet. Dry ink is a fact you can rely on.
- So a mark only appears once it is true (our rule: never show "safe" before it is). When it appears, it fades up slowly to its resting opacity. It never scales, bounces, glows or changes colour.
- Anything that is **already** true when the screen loads is just there. Nothing animates on first render. With 40 rows, 40 marks fading in at once would be noise, and it would be a lie, because nothing just happened.

I tested other worlds and dropped them. They are listed at the end.

Labels stay plain (our rule). The world lives only in motion and timing, never in names. Nobody sees the word "ink" or "settle" in the app. Those are only our names for building.

## The three moments

### 1. Backed-up mark settles in ("Settle")
- **When:** a row's `backup` changes from `pending` to `backed_up` **while the list is on screen** (after a `storage://changed` refresh). On a fresh load, a mark that is already `backed_up` just shows, with no motion.
- **What happens:** the small glyph fades from opacity 0 to its resting opacity (about 0.45, Jony's call: dim enough to be the quietest signal in the row). No movement, no scale, no colour change, no sound.
- **Timing:** 600 ms, `cubic-bezier(0.2, 0, 0, 1)` (a soft ease-out: it arrives almost at once, then slowly finishes, like ink drying).
- **Reduced motion:** the mark appears at its resting opacity with no transition.
- **What it means:** "the promise is kept." This call's video is safe. It's a receipt, not news.
- **What the user feels:** if they happen to be looking, a small "oh good". If they aren't looking, they miss nothing. The mark is simply there next time. That's fine, because a receipt doesn't need a ceremony.
- **Glyph:** a small check (SF-style `checkmark`, a stroke matching the outcome glyph's weight, at caption size or smaller), in `--color-text-muted` or the closest core colour. **Not a cloud.** A cloud says "OneDrive" before it says "safe". A cloud next to every row also reminds people without OneDrive that something is missing. The hover/aria text names OneDrive.
- **Words:**
  - `backed_up`: tooltip and `aria-label` "Video backed up to OneDrive". This follows Q1 in the research: only the video goes up, so we don't overclaim (W1).
  - `pending`: **no mark** (my answer to Q2: nothing, to avoid W4). If Jony keeps an element for layout, it is empty, with `aria-hidden`. The words "Not backed up yet" go only into the row's accessible description, so screen-reader users can tell the difference. Problems stay in StorageStatusLine.
  - `not_connected`: no element, no label, no reserved space.
- **Going back:** if a row goes from `backed_up` to `pending` (the cloud copy goes `missing`), the mark simply disappears, with no fade-out. A truth that stops being true shouldn't linger.
- **Heavy?** Very light. One CSS opacity transition. Add a "settling" class only when the previous render was `pending` and the new one is `backed_up`, so no motion on first render. Keep the previous value in a ref inside `VideoListItem`.
- **Builds it:** Jony (VideoListItem). Eraser checks: no motion on load, nothing for `not_connected`.

### 2. Turning to another session ("Turn the page")
- **When:** the user picks a different row (by click or keyboard).
- **What happens:** the old session's content is replaced **at once**. The new title, facts, notes and detail view then fade in from opacity 0.6 to 1. There is no fade-out first, so nothing waits. The video element is not faded, so the player never flashes black twice. The list doesn't move. Only the selected-row background changes, and it changes at once.
- **Timing:** 140 ms, `ease-out`. Short enough to never feel like waiting. Long enough that the eye sees "this is a new page", not a flicker.
- **Reduced motion:** an instant swap, no fade.
- **What it means:** "you turned to another call." It's the same desk with a different page on it.
- **What the user feels:** that the screen is steady. When they step through calls quickly with the arrow keys on a Friday, the soft swap stops the hard flash of all the text changing at once. Because it starts at 0.6 (not 0), you can read it from the very first frame.
- **Repeats often?** Yes, many times a session. That's why it's the shortest, smallest moment here, and why it starts at 0.6 rather than 0.
- **Heavy?** Very light. Key the hero content wrapper on `selected.id` with a CSS `animation` on mount (opacity only). No JS timers.
- **Builds it:** Jony (Hero / PerformanceReview.tsx).

### 3. A call marked reviewed settles too ("Settle", reused)
- **When:** the user ticks "reviewed" for the selected session. This is the moment of closing the loop (research #6).
- **What happens:** whatever reviewed mark Jony picks for the row (the research asks to retire the 3 px `--color-reviewed` bar) uses **the same settle** as moment 1: opacity 0 to its rest, no movement. Unticking it removes the mark at once.
- **Timing:** 600 ms, `cubic-bezier(0.2, 0, 0, 1)`. The same values as moment 1, on purpose. One motion language means one thing: "this is now true."
- **Reduced motion:** it appears at once.
- **What it means:** "done with this one." The row quietly looks finished.
- **What the user feels:** a small, private sense of done. They see it out of the corner of their eye in the list while their hand is still on the header control. It's satisfying without any fuss.
- **Heavy?** Free, because it shares the CSS with moment 1. Same rule: animate only on a live change, never on load.
- **Builds it:** Jony (VideoListItem).

## Shared values (one place for Jony to put them)
| Name | Value | Used by |
|---|---|---|
| settle | `600ms cubic-bezier(0.2, 0, 0, 1)`, opacity only | backed-up mark, reviewed mark |
| page | `140ms ease-out`, opacity 0.6 → 1 | hero content on session change |

- Every motion sits inside `@media (prefers-reduced-motion: no-preference)`, or is switched off under `reduce`, as `StorageStatusLine.styles.module.css` already does.
- Opacity only: no layout shift, nothing moves under the cursor, nothing changes while the user is typing notes.
- No sound in any of these moments. The screen is often used with call audio playing in headphones, so a chime would break in on the recording.

## Loudness order inside a row (from the research, kept)
title > outcome glyph > reviewed mark > backed-up mark. The backed-up mark is always the faintest. If it ever catches the eye first, it's too strong.

## Ideas I tried and cut
| Idea | Why cut |
|---|---|
| Cloud glyph for the mark | Says "OneDrive" rather than "safe"; it reminds non-users of something missing. A check plus the hover words does the job. |
| Faint or dotted mark for `pending` | Reads as "broken" or "half" (W4), and adds a mark to nearly every row during uploads. |
| A progress ring or pulse per row while uploading | A spinner on each row is the clutter the research warns about. Progress belongs to StorageStatusLine. |
| The mark briefly brightening, then dimming to rest | It's a tiny "look at me". It breaks the loudness order. |
| Small scale-in (0.8 → 1) on the mark | Movement draws the eye much more than opacity does, and at 10 px it reads as a twitch. |
| "All backed up" line or check in the summary when everything is safe | It's a second place that talks about backup. It's also close to a toast. The summary line stays for problems only. |
| A wax-seal or stamp metaphor | Too ornate for a calm Mac app. It needs explaining. |
| A darkroom "developing → fixed" world | A lovely meaning, but it suggests a slow visual change (blur to sharp) that would cost more to build and run, and would be loud. Ink drying gives the same meaning, with opacity only. |
| Fading the video in on session change | The player would flash black twice. Video frames should cut. |
| Fade-out then fade-in on session change | It makes people wait for the old page to leave. Magic never costs time. |
| A "Saved" word under notes after typing | It meets a real fear (research #2), but it's a new element. It also needs confirmation that the write finished (today the write is fire-and-forget, `PerformanceReview.script.ts`). Worth a separate item. It's not in this calm-down. |
| A list row sliding to its new position on rename or date change | It moves under the cursor, and it's rare. Not worth the motion. |
| Sound on backed up | A chime over a call recording is intrusive, and nobody asked to hear about storage. |
| Animating every mark on first load | It's a lie (nothing just happened), and it's noisy with long lists. |
| Outcome glyph colour cross-fade on state change | A colour change is already clear, and the change happens in the header, where the eye is. It's an extra moment with no new meaning. |

## Hand-off
- **Jony:** build moments 1–3 from the two shared values. Use a check glyph, not a cloud. Use "Video backed up to OneDrive" as the tooltip and aria label. Show nothing visible for `pending` and no element at all for `not_connected`. Add the "settling" class only on a live `pending → backed_up` change (and on a live reviewed tick). Key the hero content fade on `selected.id`, and leave the video out of it. Put both motions behind the reduced-motion guard. Note in `03-ui-spec.md` if you choose different values, and why.
- **Eraser:** check that there is no motion on first load, that nothing renders for `not_connected`, that `pending` has no visible mark, that the backed-up mark is the faintest thing in the row, that reduced motion gives instant states, and that no badge, toast, colour burst or sound has crept in.
- **Columbo:** I answered Q1 ("Video backed up to OneDrive") and Q2 (nothing for `pending`) from the magic side. The final call is yours.
