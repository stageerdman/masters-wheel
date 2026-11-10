// Scorecard types + rating metadata. The criteria scored (names + what
// each one means) are user-defined per Space — see src/lib/settings'
// `scorecardCriteria` — not fixed in code. This module owns the shape and
// meaning of the *rating* data; records owns reading/writing
// scorecard.json; settings owns the criteria list itself.

// An opaque, stable id referencing a ScorecardCriterionDef in that Space's
// settings — never the criterion's display name, so renaming a score
// never orphans historical scorecards that reference its id.
export type ScorecardCriterionId = string;

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
  // The AI's reasoning for this score — may itself contain inline
  // [MM:SS]/[HH:MM:SS] references, rendered clickable (see
  // ScorecardRow's remarkTimestamps).
  reasoning: string;
  // Every moment in the call this phase occurred — empty for a Skipped
  // item with no moment to point at. More than one entry covers a phase
  // that happens more than once in a call (e.g. several objections during
  // Resolving Limitation); the first entry is the phase's start by
  // convention.
  timestamps: number[];
};

export type Scorecard = {
  generatedAt: string;
  // One item per that Space's configured scorecard criteria, same order.
  items: ScorecardItem[];
  // A short summary of the whole call, shown once below every row.
  summary: string;
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
