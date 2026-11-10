// Question Analysis types. The *rating* data a Scorecard carries doesn't
// apply here — this is a plain extraction: every question the salesperson
// asked on the call, cleaned up, paired with a clean one-line outcome for
// whatever answer it got (even if the real answer was messy or spread
// across several replies). src/lib/records owns reading/writing
// question_analysis.json; this module just owns the shape.

export type QuestionAnswerPair = {
  question: string;
  answer: string;
  // Seconds into the call the question was asked, or null if the model
  // couldn't place it — same optional-timestamp convention ScorecardItem
  // uses, see src/lib/scorecard/index.ts.
  timestampSeconds: number | null;
};

export type QuestionAnalysis = {
  generatedAt: string;
  pairs: QuestionAnswerPair[];
};
