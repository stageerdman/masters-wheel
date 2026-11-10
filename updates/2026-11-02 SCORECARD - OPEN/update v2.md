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

### Phase 3 — tracking + verification (Phases 1-2)
- [x] `FEATURES.md` updated (Scorecard bullet under Performance Review).
- [x] SSR sanity check via `curl` against a disposable `npm run dev`
      instance (none was already running) — `/performance-review` and
      `/settings` both 200, no error overlay. Stopped that disposable
      server afterward.
- [ ] **Not verified this session**: live click-through (row expand/
      collapse, multi-timestamp chips, inline `[MM:SS]` clicks, call
      summary rendering) — no browser tool per CLAUDE.md's verification
      constraint. Please check this yourself in the real app.

### Phase 4 — real AI generation + header trigger
Closes the "fake fabrication" deferral from v1 — `generateFakeScorecard`
is gone; "Generate Scorecard" and the header's new "SC" button (see
`updates/2026-11-10 TRANSCRIPT-SAFETY - OPEN/update v1.md`'s sibling work
on the same header component) both call the real local `claude` CLI now.
- [x] `src-tauri/src/claude_cli.rs` (new): extracted `roleplay.rs`'s
      private `run_claude` sync helper here (generalize-on-second-consumer
      — scorecard generation is the second real need for "run claude
      once, get text back"), plus a new thin
      `#[tauri::command] run_claude_once(system_prompt, message) ->
      Result<String, String>` wrapper that discards the session id (no
      `--resume` needed for a one-shot call). `roleplay.rs` now imports
      `run_claude` from here instead of defining it locally — its own
      `extract_label`/`extract_bullets_after` stay put (only used there).
- [x] `src/lib/scorecard/generate.ts` fully repurposed (the fake fixture
      is gone): `buildScorecardPrompt` restates the rubric via
      `SCORECARD_RATING_META` (no duplicated prose) plus the dynamic
      criteria list + business description, instructing the model to
      output plain **labeled lines** per criterion
      (`CRITERION:`/`RATING:`/`TIMESTAMPS:`/`REASONING:`), then a `===`
      separator, then `SUMMARY:`/`IMPROVEMENT:` — not JSON content, same
      empirically-justified choice `roleplay.rs` already made (see its
      module doc). `parseScorecardReply` parses that defensively (a
      malformed/missing block is skipped, never throws) using the same
      first-matching-line tolerance as Rust's `extract_label`. Calls
      `invoke("run_claude_once", ...)`.
- [x] `PerformanceReview.script.ts`'s `generateScorecard`: guards on no
      transcript yet (`message()` info dialog, bails), now also loads
      `businessDescription` from the same `readSettings()` read already
      fetching `scorecardCriteria`. New `scorecardError` state on
      failure, surfaced by `Scorecard.tsx` as an inline error + "Try
      again" (empty state) or a thin banner above the rows (regenerating
      an existing scorecard).
- [x] Header's "AI re-analyze" button (`ActionIsland.tsx`, previously a
      pure no-op) → "SC", wired to `onGenerateScorecard`; confirms first
      via `confirm()` if a scorecard already exists (regeneration
      replaces it). `hasScorecard`/`isGeneratingScorecard`/
      `onGenerateScorecard` threaded through `HeaderIsland`
      (`AppHeader.context.tsx`) the same way `reviewed`/`onToggleReviewed`
      already were.
- [x] `cargo test --release roleplay` (11 tests) still passes after the
      extraction; `tsc --noEmit`, `npm run lint`, `npm run build` all
      clean.
- [ ] **Not verified this session**: an actual `claude` CLI round-trip
      (depends on your own authenticated local session) — the header
      button's regenerate-confirm dialog, and a real multi-criterion reply
      parsing correctly end-to-end. Please try a real generation yourself.

### Phase 5 — two real-use bugs, both fixed
- [x] Every local `claude -p` call (not just Scorecard — `assistant.rs`'s
      `ask_agent`/`name_chat` had the same latent bug) failed on a prompt
      starting with `-`, which this app's transcripts always do
      (`---` frontmatter). `-p` takes no value of its own; fixed by
      moving every real flag before it and appending `-p -- <message>`
      last, confirmed empirically against the real binary before
      shipping — see `updates/2026-11-10 TRANSCRIPT-SAFETY - OPEN/wiki.md`.
- [x] `generateScorecard` (`src/lib/scorecard/generate.ts`) now filters
      out any criterion with an empty name or prompt before building the
      prompt — `ScorePanel`'s perpetual trailing blank row (there so
      there's always somewhere to type the next score) was getting sent
      to the model and scored as "Untitled score." Settings-UI
      scaffolding should never reach the model.

## Decisions
- Deletion of a Score row wasn't explicitly requested but was added as a
  minimal necessary affordance in the Settings UI (see the Settings
  update) — without it a mistaken entry could never be corrected.
- `generateFakeScorecard`'s old hand-written per-criterion fake reasoning
  (one bespoke sentence per fixed id) was replaced with a generic
  rating-keyed template, since criteria are no longer a known fixed set.
- Real generation (Phase 4) uses plain labeled-line output, not JSON
  content from the model — reusing `roleplay.rs`'s own empirically-tested
  choice rather than re-opening that question. All parsing (both the
  reply format and `[MM:SS]`/timestamp conversion) lives in TypeScript;
  Rust (`claude_cli.rs`) stays a dumb transport layer, same division
  already established between `src/lib/scorecard` and `src/lib/records`.
- No cancel/progress-job tracking for scorecard generation (unlike
  transcript generation's job registry) — a plain boolean + `.catch()`,
  matching `roleplay.rs`'s simpler one-shot-await pattern rather than
  `transcribe.rs`'s heavier tracked-job one. Revisit if a real call
  regularly runs long enough that users actually want to cancel it.
