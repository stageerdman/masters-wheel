// Shared types + call-state glyph/color/label metadata for Performance
// Review. Real record data now lives on disk, loaded through
// src/lib/records — see PerformanceReview.tsx and PerformanceReview.script.ts.
// The old fake fixture (FAKE_VIDEOS / mainText) has been removed.

export type CallState = "closed" | "training" | "postponed" | "failed" | "notQualified";

export const CALL_STATE_ORDER: CallState[] = [
  "closed",
  "training",
  "postponed",
  "failed",
  "notQualified",
];

// Shared glyph/color/label/description per call state — same visual
// language used by the Navigation list icons and the header's
// state-change dropdown, so both read off this one source of truth
// instead of duplicating the mapping. `description` is shown as a hover
// tooltip when picking a state from the dropdown.
export const CALL_STATE_META: Record<
  CallState,
  { glyph: string; color: string; label: string; description: string }
> = {
  closed: {
    glyph: "$",
    color: "var(--color-status-closed)",
    label: "Closed",
    description: "Deal closed — payment secured.",
  },
  training: {
    glyph: "●",
    color: "var(--color-status-training)",
    label: "Training",
    description: "Internal practice session, not a real client call.",
  },
  postponed: {
    glyph: "→",
    color: "var(--color-status-postponed)",
    label: "Postponed",
    description: "Call pushed to a later date — needs a follow-up.",
  },
  failed: {
    glyph: "✕",
    color: "var(--color-status-failed)",
    label: "Failed",
    description: "Genuine opportunity that didn't close.",
  },
  notQualified: {
    glyph: "−",
    color: "var(--color-status-not-qualified)",
    label: "Not Qualified",
    description: "Lead wasn't a fit — never a real opportunity.",
  },
};

export type TranscriptLine = {
  time: string;
  text: string;
};

export type VideoRecord = {
  id: string;
  // A freshly created record starts unclassified (null) rather than
  // guessing a state — see this update's wiki.md.
  state: CallState | null;
  // The actual meeting date, editable — not when the record was added.
  date: string;
  // Auto-filled the moment state first becomes "closed"; editable after.
  closedDate: string | null;
  title: string;
  // No real transcription yet (deferred to a later update) — always [].
  transcript: TranscriptLine[];
  notes: string;
  aiAnalysis: string;
  // Deliberately in-memory only this round — not persisted, see wiki.md.
  lessons: string;
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
};
