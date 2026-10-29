// Shared types + call-state glyph/color/label metadata for Performance
// Review. Real record data now lives on disk, loaded through
// src/lib/records — see PerformanceReview.tsx and PerformanceReview.script.ts.
// The old fake fixture (FAKE_VIDEOS / mainText) has been removed.

export type CallState = "closed" | "training" | "postponed" | "failed";

export const CALL_STATE_ORDER: CallState[] = ["closed", "training", "postponed", "failed"];

// Shared glyph/color/label per call state — same visual language used by the
// Navigation list icons and the header's state-change dropdown, so both read
// off this one source of truth instead of duplicating the mapping.
export const CALL_STATE_META: Record<CallState, { glyph: string; color: string; label: string }> = {
  closed: { glyph: "$", color: "var(--color-status-closed)", label: "Closed" },
  training: { glyph: "●", color: "var(--color-status-training)", label: "Training" },
  postponed: { glyph: "→", color: "var(--color-status-postponed)", label: "Postponed" },
  failed: { glyph: "✕", color: "var(--color-status-failed)", label: "Failed" },
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
  date: string;
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
