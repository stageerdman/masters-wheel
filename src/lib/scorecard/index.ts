// Scorecard types + fixed criteria/rating metadata — the dictated 11
// criteria and 5 rating levels for scoring a sales call. Kept separate
// from src/lib/records (plain disk I/O) the same way src/lib/transcript is
// separate from it: this module owns the shape and meaning of the data,
// records owns reading/writing scorecard.json.

export type ScorecardCriterionId =
  | "frameSetting"
  | "discoveryProblemAnchor"
  | "discoveryCurrentState"
  | "discoveryProblemImpacts"
  | "discoveryIdealGoal"
  | "discoveryConsequences"
  | "discoveryWhyNow"
  | "summary"
  | "solution"
  | "closing"
  | "resolvingLimitation";

export const SCORECARD_CRITERIA_ORDER: ScorecardCriterionId[] = [
  "frameSetting",
  "discoveryProblemAnchor",
  "discoveryCurrentState",
  "discoveryProblemImpacts",
  "discoveryIdealGoal",
  "discoveryConsequences",
  "discoveryWhyNow",
  "summary",
  "solution",
  "closing",
  "resolvingLimitation",
];

export const SCORECARD_CRITERIA_META: Record<ScorecardCriterionId, { label: string; description: string }> = {
  frameSetting: {
    label: "Frame Setting",
    description:
      "It's clear what the client can expect from the call: what areas get covered, what result they'll have by the end, and that a decision can be made today.",
  },
  discoveryProblemAnchor: {
    label: "Discovery — Problem Anchor",
    description:
      "A problem is clearly, explicitly named by the client — ideally the first thing asked in discovery — and repeated back to confirm it.",
  },
  discoveryCurrentState: {
    label: "Discovery — Current State",
    description:
      "The contextual environment of the problem: how long it's lasted, what's been tried, what worked or didn't, and whether this is even solvable here.",
  },
  discoveryProblemImpacts: {
    label: "Discovery — Problem Impacts",
    description:
      "How the problem actually shows up day to day — relationships, work, self-esteem — and what frustrates the client most about it.",
  },
  discoveryIdealGoal: {
    label: "Discovery — Ideal Goal",
    description:
      "What the client truly wants to achieve — a number or stated goal, the emotion underneath why it matters, and the impact reaching it would have.",
  },
  discoveryConsequences: {
    label: "Discovery — Consequences",
    description:
      "What happens if this problem just continues — what the client is afraid of, and why resolving it now instead of later actually matters.",
  },
  discoveryWhyNow: {
    label: "Discovery — Why Now",
    description:
      "Whether the client is ready to start today, and the emotional reason they want to start now rather than wait any longer.",
  },
  summary: {
    label: "Summary",
    description:
      "Shows the client their situation was understood and processed, ending with a real check — \"did I get that right?\" — not just a replay of what they said.",
  },
  solution: {
    label: "Solution",
    description:
      "Presents the solution with no hedging, using the client's own words, in up to 3 pillars that map directly to what they said they want.",
  },
  closing: {
    label: "Closing",
    description:
      "Leads the client to a decision right now — surfacing hesitations before the price, then stating the price plainly, with no extra talk around it.",
  },
  resolvingLimitation: {
    label: "Resolving Limitation",
    description:
      "Catching objections, doubts, or contradictions the moment they appear and actually resolving them — not just noticing and moving past them.",
  },
};

// 0 doesn't carry a score (see finalScore below) — it's for a deliberate,
// legitimate omission (e.g. the client was irrelevant, or recording
// started mid-call), never for something the salesperson simply forgot.
// Forgetting is Poor, not Skipped.
export type ScorecardRating = 0 | 1 | 2 | 3 | 4;

export const SCORECARD_RATING_ORDER: ScorecardRating[] = [0, 1, 2, 3, 4];

export const SCORECARD_RATING_META: Record<
  ScorecardRating,
  { label: string; color: string; description: string }
> = {
  0: {
    label: "Skipped",
    color: "var(--color-rating-skipped)",
    description: "Skipped entirely — a deliberate, legitimate omission, not a forgotten step.",
  },
  1: {
    label: "Poor",
    color: "var(--color-rating-poor)",
    description: "There was an attempt, but it was messy, unclear, and didn't get the desired outcome.",
  },
  2: {
    label: "Good",
    color: "var(--color-rating-good)",
    description: "An okay attempt — didn't fully follow the principle, got some result, but far from what's needed.",
  },
  3: {
    label: "Great",
    color: "var(--color-rating-great)",
    description: "Almost a textbook execution — the client's answer is genuinely useful and workable.",
  },
  4: {
    label: "Outstanding",
    color: "var(--color-rating-outstanding)",
    description: "The right question at the right time, held until it actually produced the result that was needed.",
  },
};

export type ScorecardItem = {
  criterion: ScorecardCriterionId;
  rating: ScorecardRating;
  // The AI's reasoning for this score. null timestamp for a Skipped item
  // with no moment in the call to point at.
  reasoning: string;
  timestampSeconds: number | null;
};

export type Scorecard = {
  generatedAt: string;
  // Always exactly one item per SCORECARD_CRITERIA_ORDER entry, same order.
  items: ScorecardItem[];
  improvementSuggestion: string;
};

// Skipped items don't count toward the average — per dictation, Skipped
// has no score at all, it isn't a zero.
export function finalScore(scorecard: Scorecard): number | null {
  const scored = scorecard.items.filter((item) => item.rating !== 0);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, item) => sum + item.rating, 0);
  return total / scored.length;
}
