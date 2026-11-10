# Scorecard — v2

## Goal
Two follow-ups on top of v1's shipped Scorecard:

1. Turn the 11 hardcoded scoring criteria into a real, user-editable,
   per-Space list (dictated as part of the Settings page redesign — see
   `updates/2026-11-10 SETTINGS-REDESIGN - OPEN/update v1.md`). Built
   first, since the row-expand work below depends on criteria already
   being dynamic.
2. Replace the per-row hover tooltip + separate "document" reasoning
   modal with click-to-expand *inline on the row itself* (accordion, one
   row open at a time): the timestamp(s) that phase occurred at (plural —
   some phases like objection handling happen more than once, each
   independently clickable and seeking the real video), the AI's
   reasoning (with inline `[MM:SS]`-style timestamps inside the prose also
   clickable), and a whole-call summary shown once below all rows.

## Phases

### Phase 1 — dynamic scoring criteria data model
- [x] `src/lib/settings`: `ScorecardCriterionDef` (`id`/`name`/`prompt`),
      `SpaceSettings.scorecardCriteria`, seeded with the original 11
      criteria (same ids as the old fixed `ScorecardCriterionId` union)
      so existing `scorecard.json` files keep resolving with zero
      migration. Tolerant parse, same convention as every other
      per-Space storage module.
- [x] `src/lib/scorecard/index.ts`: dropped the fixed
      `ScorecardCriterionId` union / `SCORECARD_CRITERIA_ORDER` /
      `SCORECARD_CRITERIA_META` — `criterion` is now a plain `string` id
      into that Space's configured criteria. Rating type/meta
      (`ScorecardRating`, `SCORECARD_RATING_META`) unchanged — the 5-stage
      rubric stays fixed/global, not per-score-editable.
- [x] `src/lib/scorecard/generate.ts`: `generateFakeScorecard` now takes
      `(criteria: ScorecardCriterionDef[])` and fabricates one item per
      *configured* criterion generically (can't hand-write bespoke
      reasoning per id anymore, since criteria are open-ended/user-authored).
- [x] `src/lib/records/index.ts`: scorecard parse no longer validates
      `criterion` against a fixed list (any non-empty string is
      accepted); `items.length === 0` is now the only "corrupt" rejection.
- [x] Threaded `scorecardCriteria` (loaded once from settings) from
      `PerformanceReview.script.ts` → `PerformanceReview.tsx` → `Hero`/
      `Detail` → `TextView` → `Scorecard` → `ScorecardRow`/`ReasoningModal`,
      replacing the removed static-map lookups.
- [x] `tsc --noEmit`, `npm run lint`, `npm run build` all clean.

### Phase 2 — row expand, multi-timestamp, inline reasoning, call summary
- [x] `src/lib/scorecard/index.ts`: `ScorecardItem.timestampSeconds: number
      | null` → `timestamps: number[]` (first entry is the phase's start
      by convention, later entries cover repeats); `Scorecard` gains
      `summary: string`.
- [x] `src/lib/records/index.ts`: tolerant upgrade for old persisted
      files — a legacy `timestampSeconds` becomes a one-/zero-entry
      `timestamps` array; missing `summary` defaults to `""`.
- [x] `src/lib/scorecard/generate.ts`: produces `timestamps` arrays
      (mostly length 1; the second-to-last criterion gets 3 jittered
      timestamps to exercise the multi-timestamp UI), inline `[MM:SS]`
      references inside the fabricated reasoning text, and a fabricated
      `summary`.
- [x] `src/elements/Scorecard/children/ScorecardRow`: now the
      expand/collapse surface itself (lifted `expandedCriterion` state in
      `Scorecard.tsx`, one row open at a time) — dropped the old
      criterion-label hover tooltip (superseded by the expand).
      `ScorecardRow.script.ts`'s `remarkTimestamps` (modeled directly on
      `Message.script.ts`'s `remarkMentions`) makes `[MM:SS]`/`[HH:MM:SS]`
      substrings inside the reasoning prose clickable, independent of the
      structured `timestamps[]` chips above it; both call the same
      `onSeek` now threaded all the way into the row.
- [x] Removed `src/elements/Scorecard/children/ReasoningModal` and the
      header's document button entirely — same reasoning + timestamp
      data now lives inline per row, so the separate modal duplicated it.
- [x] `tsc --noEmit`, `npm run lint`, `npm run build` all clean.

### Phase 3 — tracking + verification
- [x] `FEATURES.md` updated (Scorecard bullet under Performance Review).
- [x] SSR sanity check via `curl` against a disposable `npm run dev`
      instance (none was already running) — `/performance-review` and
      `/settings` both 200, no error overlay. Stopped that disposable
      server afterward.
- [ ] **Not verified this session**: live click-through (row expand/
      collapse, multi-timestamp chips, inline `[MM:SS]` clicks, call
      summary rendering) — no browser tool per CLAUDE.md's verification
      constraint. Please check this yourself in the real app.

## Decisions
- Deletion of a Score row wasn't explicitly requested but was added as a
  minimal necessary affordance in the Settings UI (see the Settings
  update) — without it a mistaken entry could never be corrected.
- `generateFakeScorecard`'s old hand-written per-criterion fake reasoning
  (one bespoke sentence per fixed id) was replaced with a generic
  rating-keyed template, since criteria are no longer a known fixed set —
  real AI generation (still deferred, see v1's wiki.md) won't have this
  limitation.
