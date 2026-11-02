# Scorecard — v1

## Goal
Add "Scorecard" (SC) as a 5th bookmark kind alongside AI / Transcript (TR) /
Notes (NT) / Core Lessons (CL). It's a visual scoring of the sales call
against 11 fixed criteria (Frame Setting, Discovery's Problem Anchor,
Discovery's Current State, Discovery's Problem Impacts, Discovery's Ideal
Goal, Discovery's Consequences, Discovery's Why Now, Summary, Solution,
Closing, Resolving Limitation). Each criterion is rated Skipped/Poor/Good/
Great/Outstanding, color-coded, with a hover tooltip explaining what that
criterion and that rating level mean. Below the rows sits a short AI
improvement-suggestion text. A document button next to the "Scorecard"
title opens a modal showing the AI's full reasoning per item with a
clickable timestamp (seeks the real video).

This round is **UI shell only** — "Generate Scorecard" produces a locally
fabricated fake result (not a real AI call), but that result is **really
persisted** to disk (`scorecard.json` per record), same as meta.json/
transcript.md. Real AI generation is a future update, same deferral pattern
already used for AI analysis / transcription.

## Phases

### Phase 1 — Data model + fake generation + persistence
- [x] `src/lib/scorecard/index.ts`: `ScorecardCriterionId` (11 fixed ids),
      `SCORECARD_CRITERIA` (ordered id/label/description triples — the
      descriptions are the dictated definitions, used as each row's hover
      tooltip), `ScorecardRating` (0–4), `SCORECARD_RATING_META`
      (label/color var/description per level — these are the generic
      0–4 definitions, used as the rating pill's hover tooltip),
      `ScorecardItem` (criterion + rating + reasoning + timestampSeconds),
      `Scorecard` type (generatedAt + items + improvementSuggestion).
- [x] `src/lib/scorecard/generate.ts`: `generateFakeScorecard()` — produces
      a plausible-looking fake scorecard (varied ratings incl. at least one
      skipped, reasoning text per item, increasing timestamps, one
      improvement suggestion line).
- [x] `src/lib/records/index.ts`: `readScorecard`/`writeScorecard`, same
      `scorecard.json`-per-folder convention as `meta.json`.

### Phase 2 — Color tokens
- [x] `globals.css`: `--color-bookmark-scorecard` (badge) + 5 rating colors
      (`--color-rating-skipped/poor/good/great/outstanding` — gray/red/
      yellow/green/purple). Outstanding's "legendary" look is built from
      `color-mix()` on that one purple variable (same exemption precedent
      as the glass-surface tokens), not new raw hex stops.

### Phase 3 — Bookmark system integration
- [x] `BookmarkBadge.tsx`: `ContentKind` gains `"scorecard"` ("SC").
- [x] `BookmarkRail.tsx`, `Hero.script.ts`, `Detail.script.ts`: add
      `"scorecard"` to each's kind list (3 separate arrays today — same
      existing duplication, not newly introduced).

### Phase 4 — `Scorecard` element
- [x] `src/elements/Scorecard/`: empty state (just a "Generate Scorecard"
      button) vs. generating vs. generated (header with title + document
      button, 11 `ScorecardRow`s, improvement-suggestion box).
- [x] `children/ScorecardRow`: criterion label (hover = criterion
      description) + color-coded rating pill (hover = rating-level
      description); Outstanding gets the animated gradient/glow.
- [x] `children/ReasoningModal`: the document button's popup — same
      backdrop+panel shell as `TranscriptUploadModal` — one entry per
      criterion with its reasoning text and a clickable `mm:ss` timestamp
      that seeks the real video (reuses the existing `onSeek` plumbing
      Transcript already has).

### Phase 5 — Wiring
- [x] `VideoRecord` gains `scorecard: Scorecard | null`.
- [x] `TextView.tsx` renders `<Scorecard>` for `kind === "scorecard"`.
- [x] `PerformanceReview.script.ts`: lazy-load `scorecard.json` per record
      (same pattern as notes/analysis/transcript), `generateScorecard(id)`
      (fake delay, then fabricate + persist), generating-state tracking.
- [x] Thread through `Hero.tsx` → `Detail.tsx` → `TextView.tsx`; reuse the
      page's existing `seekTranscript` for the reasoning modal's seek.

### Phase 6 — Tracking + verification
- [x] `FEATURES.md`: new Scorecard bullets under Performance Review.
- [x] `npm run build`, `npm run lint`, `tsc --noEmit` all clean.
- [x] SSR HTML sanity check via `curl` against a disposable `npm run dev`
      instance (no Tauri fs bridge outside the app shell, so this only
      confirms the page renders its empty state cleanly with no
      error overlay — not the Scorecard UI itself).
- [ ] **Not verified this session**: live click-through (generate → rows
      render → hover tooltips → legendary Outstanding glow → document
      modal → timestamp seek) — no connected browser per CLAUDE.md's
      verification constraint. Ask the user to check it themselves in the
      real app.

## Next
- Real AI generation (replace the fake fabricator with an actual transcript
  analysis pass) is a future update, same deferral already applied to AI
  analysis / lesson extraction elsewhere on this page.
- Regenerate / re-score a single criterion — not requested this round.

## Decisions
- Committed alongside unrelated in-progress MCP-tools/multi-agent-chat work
  that was already sitting uncommitted in the same working tree (some of
  it interleaved in the same files, e.g. `PerformanceReview.script.ts`'s
  `setActiveRecord` effect) — by explicit user choice, one combined commit
  rather than a surgical per-feature split. See git log.

