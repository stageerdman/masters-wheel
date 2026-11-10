// Fake scorecard fabrication — this round's "Generate Scorecard" doesn't
// call real AI (deliberately deferred, see this update's wiki.md); it
// fabricates a plausible-looking result for whichever criteria that Space
// has configured (see src/lib/settings' `scorecardCriteria` — criteria
// are user-defined, not fixed in code, so this can't hand-write bespoke
// reasoning per criterion anymore). Swapping this for a real
// transcript-analysis pass later doesn't change anything downstream —
// callers only depend on the `Scorecard` shape.

import { formatTimestamp } from "@/lib/transcript";
import type { ScorecardCriterionDef } from "@/lib/settings";
import type { Scorecard, ScorecardItem } from "./index";

// Cycled across criteria in order so every generation includes the full
// rating range at least once (incl. a legitimate Skip), same spread the
// old hand-written fixture had — just generic rather than bespoke per id.
const RATING_CYCLE: ScorecardItem["rating"][] = [0, 3, 2, 4, 3, 2, 4, 1, 3, 2, 1];

// Reasoning text may itself reference a moment in the call as [MM:SS] —
// ScorecardRow's remarkTimestamps plugin makes that substring clickable
// too, independent of the structured timestamps[] chips above it.
const REASONING_BY_RATING: Record<ScorecardItem["rating"], (name: string, at: string) => string> = {
  0: (name) => `Skipped — no clean moment in the call to work ${name.toLowerCase()} in.`,
  1: (name, at) =>
    `There was an attempt at ${name.toLowerCase()} around [${at}], but it stayed messy and didn't land — the client's response made that clear.`,
  2: (name, at) => `${name} got a real but partial pass at [${at}] — some result, but well short of what this section needs.`,
  3: (name, at) => `Close to a textbook ${name.toLowerCase()} at [${at}] — the client's answer here is genuinely usable going forward.`,
  4: (name, at) =>
    `${name} landed exactly as intended at [${at}] — held the line until the client gave the specific answer this section is built to surface.`,
};

const FAKE_SUMMARY =
  "A generally solid call: discovery surfaced a real, specific problem and urgency, but the summary before the pitch ran long and lost some of the client's buy-in right before the close.";

const IMPROVEMENT_SUGGESTION =
  "Right now the highest-leverage fix is whichever section scored lowest — tightening just that one spot will likely move the close rate more than anything else in this call.";

// Small jitter so repeated "generations" don't look byte-identical, without
// risking an unrealistic ordering (each item still lands within a few
// seconds of its fixed base).
function jitter(seconds: number): number {
  return Math.max(0, Math.round(seconds + (Math.random() - 0.5) * 6));
}

export function generateFakeScorecard(criteria: ScorecardCriterionDef[]): Scorecard {
  const items: ScorecardItem[] = criteria.map((criterion, index) => {
    const rating = RATING_CYCLE[index % RATING_CYCLE.length];
    const name = criterion.name || `Score ${index + 1}`;
    if (rating === 0) {
      return { criterion: criterion.id, rating, reasoning: REASONING_BY_RATING[0](name, ""), timestamps: [] };
    }
    const baseSeconds = 180 + index * 150;
    // The last scored criterion stands in for a phase that recurs during
    // the call (e.g. several objections) — multiple independently
    // clickable timestamps instead of just one.
    const isRepeated = index === criteria.length - 2;
    const timestamps = isRepeated
      ? [jitter(baseSeconds), jitter(baseSeconds + 220), jitter(baseSeconds + 410)]
      : [jitter(baseSeconds)];
    return {
      criterion: criterion.id,
      rating,
      reasoning: REASONING_BY_RATING[rating](name, formatTimestamp(timestamps[0])),
      timestamps,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: FAKE_SUMMARY,
    improvementSuggestion: IMPROVEMENT_SUGGESTION,
  };
}
