// Shared types + call-state glyph/color/label metadata for Performance
// Review. Real record data now lives on disk, loaded through
// src/lib/records — see PerformanceReview.tsx and PerformanceReview.script.ts.
// The old fake fixture (FAKE_VIDEOS / mainText) has been removed.

import type { Scorecard } from "@/lib/scorecard";
import type { BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";

// Which text kind Hero/Detail can show, and how each renders as a
// bookmark badge (color + 2-letter label — see this element's own
// "Bookmarks are visually minimal by design" note in
// `updates/2026-10-28 PERFORMANCE-REVIEW - OPEN/wiki.md`). Lives here
// (page-specific data) rather than in BookmarkBadge/BookmarkRail/SplitRail
// themselves, which are generic over any kind set — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md` for why.
export type ContentKind = "ai" | "transcript" | "notes" | "lessons" | "scorecard";

export const CONTENT_KIND_ORDER: ContentKind[] = ["ai", "transcript", "notes", "lessons", "scorecard"];

export const CONTENT_KIND_META: Record<ContentKind, BookmarkMeta> = {
  ai: { label: "AI", color: "var(--color-bookmark-ai)" },
  transcript: { label: "TR", color: "var(--color-bookmark-transcript)" },
  notes: { label: "NT", color: "var(--color-bookmark-notes)" },
  lessons: { label: "CL", color: "var(--color-bookmark-lessons)" },
  scorecard: { label: "SC", color: "var(--color-bookmark-scorecard)" },
};

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
  // The record's hero video file name, or null if none has been uploaded
  // (or it was removed) — drives whether Hero shows the player or an
  // "Upload video" prompt.
  heroFileName: string | null;
  // Raw transcript.md contents, or null if none has been imported yet.
  // Parsed on demand by the Transcript element (src/lib/transcript).
  transcriptRaw: string | null;
  notes: string;
  aiAnalysis: string;
  // Deliberately in-memory only this round — not persisted, see wiki.md.
  lessons: string;
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
  // Whether the user has personally reviewed/analyzed this call.
  reviewed: boolean;
  // How many times this record has been opened — tracked for later use.
  openCount: number;
  // null until "Generate Scorecard" has been run at least once.
  scorecard: Scorecard | null;
};
