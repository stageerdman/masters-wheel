// Fake scorecard fabrication — this round's "Generate Scorecard" doesn't
// call real AI (deliberately deferred, see this update's wiki.md); it
// produces one fixed, hand-written example scorecard covering the full
// rating range (including a legitimate Skip) so the real UI can be built
// and demoed now. Swapping this for a real transcript-analysis pass later
// doesn't change anything downstream — callers only depend on the
// `Scorecard` shape.

import { SCORECARD_CRITERIA_ORDER, type Scorecard, type ScorecardItem } from "./index";

type FakeEntry = { rating: ScorecardItem["rating"]; reasoning: string; baseSeconds: number | null };

const FAKE_ENTRIES: Record<string, FakeEntry> = {
  frameSetting: {
    rating: 0,
    reasoning:
      "Skipped — recording started after the client had already been introduced, so there was no clean moment left to set a frame.",
    baseSeconds: null,
  },
  discoveryProblemAnchor: {
    rating: 3,
    reasoning:
      'Early in discovery, asked "what\'s the one thing you want solved today?" and got a direct, specific answer — repeated it back almost verbatim a few minutes later.',
    baseSeconds: 210,
  },
  discoveryCurrentState: {
    rating: 2,
    reasoning:
      "Covered how long the problem has lasted and what's been tried, but never asked about budget or timeline, leaving a blind spot going into close.",
    baseSeconds: 430,
  },
  discoveryProblemImpacts: {
    rating: 4,
    reasoning:
      'Didn\'t stop at the stated impact — kept pulling ("and what does that do to...") until the client named a knock-on effect they hadn\'t mentioned before.',
    baseSeconds: 610,
  },
  discoveryIdealGoal: {
    rating: 3,
    reasoning:
      'Got a specific number and the emotional reason behind it — "hitting that means I can finally stop worrying about this."',
    baseSeconds: 760,
  },
  discoveryConsequences: {
    rating: 2,
    reasoning: "Asked what happens if nothing changes and got a real answer, but didn't push further into the urgency behind it.",
    baseSeconds: 905,
  },
  discoveryWhyNow: {
    rating: 4,
    reasoning: 'Client said, unprompted, "I want to start now, I\'m done waiting" — exactly the outcome this section is built to surface.',
    baseSeconds: 1020,
  },
  summary: {
    rating: 1,
    reasoning:
      'Summary was really just a long replay of everything the client had said, took close to two minutes with no real frame for why — client said "yeah, that\'s what I said" at the end.',
    baseSeconds: 1240,
  },
  solution: {
    rating: 3,
    reasoning:
      "Clean transition into the pitch with no hedging language, used the client's own words for what they wanted — stopped short of tying each pillar back to the stated pain.",
    baseSeconds: 1390,
  },
  closing: {
    rating: 2,
    reasoning: "Checked for hesitation before naming the price, but moved through it quickly rather than really letting the client talk it out.",
    baseSeconds: 1600,
  },
  resolvingLimitation: {
    rating: 1,
    reasoning: "Client said something that contradicted an earlier answer about budget flexibility — it went unnoticed, with no attempt to address it.",
    baseSeconds: 1710,
  },
};

const IMPROVEMENT_SUGGESTION =
  "Right now the highest-leverage fix is Summary — it's the one spot the call nearly loses the client's buy-in right before the pitch starts. Tightening just that one section (shorter, framed, ending with a real yes/no check) will likely move the close rate more than anything else in this call.";

// Small jitter so repeated "generations" don't look byte-identical, without
// risking an unrealistic ordering (each item still lands within a few
// seconds of its fixed base).
function jitter(seconds: number): number {
  return Math.max(0, Math.round(seconds + (Math.random() - 0.5) * 6));
}

export function generateFakeScorecard(): Scorecard {
  const items: ScorecardItem[] = SCORECARD_CRITERIA_ORDER.map((criterion) => {
    const entry = FAKE_ENTRIES[criterion];
    return {
      criterion,
      rating: entry.rating,
      reasoning: entry.reasoning,
      timestampSeconds: entry.baseSeconds === null ? null : jitter(entry.baseSeconds),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    improvementSuggestion: IMPROVEMENT_SUGGESTION,
  };
}
