// Fake scorecard fabrication — this round's "Generate Scorecard" doesn't
// call real AI (deliberately deferred, see this update's wiki.md); it
// fabricates a plausible-looking result for whichever criteria that Space
// has configured (see src/lib/settings' `scorecardCriteria` — criteria
// are user-defined, not fixed in code, so this can't hand-write bespoke
// reasoning per criterion anymore). Swapping this for a real
// transcript-analysis pass later doesn't change anything downstream —
// callers only depend on the `Scorecard` shape.

import type { ScorecardCriterionDef } from "@/lib/settings";
import type { Scorecard, ScorecardItem } from "./index";

// Cycled across criteria in order so every generation includes the full
// rating range at least once (incl. a legitimate Skip), same spread the
// old hand-written fixture had — just generic rather than bespoke per id.
const RATING_CYCLE: ScorecardItem["rating"][] = [0, 3, 2, 4, 3, 2, 4, 1, 3, 2, 1];

const REASONING_BY_RATING: Record<ScorecardItem["rating"], (name: string) => string> = {
  0: (name) => `Skipped — no clean moment in the call to work ${name.toLowerCase()} in.`,
  1: (name) =>
    `There was an attempt at ${name.toLowerCase()}, but it stayed messy and didn't land — the client's response made that clear.`,
  2: (name) => `${name} got a real but partial pass — some result, but well short of what this section needs.`,
  3: (name) => `Close to a textbook ${name.toLowerCase()} — the client's answer here is genuinely usable going forward.`,
  4: (name) => `${name} landed exactly as intended — held the line until the client gave the specific answer this section is built to surface.`,
};

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
    const baseSeconds = rating === 0 ? null : 180 + index * 150;
    return {
      criterion: criterion.id,
      rating,
      reasoning: REASONING_BY_RATING[rating](criterion.name || `Score ${index + 1}`),
      timestampSeconds: baseSeconds === null ? null : jitter(baseSeconds),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    improvementSuggestion: IMPROVEMENT_SUGGESTION,
  };
}
