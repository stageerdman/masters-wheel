// Shared types + call-state glyph/color/label metadata for Performance
// Review. Real record data now lives on disk, loaded through
// src/lib/records — see PerformanceReview.tsx and PerformanceReview.script.ts.
// The old fake fixture (FAKE_VIDEOS / mainText) has been removed.

import type { Scorecard } from "@/lib/scorecard";
import type { QuestionAnalysis } from "@/lib/questionAnalysis";
import type { ClientCard } from "@/lib/clientCard";
import type { BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";
import {
  ClientCardIcon,
  QuestionsIcon,
  ScorecardIcon,
  TranscriptIcon,
} from "./children/KindIcon/KindIcon";
import type { BackupState } from "./PerformanceReview.backup";

// Backed-up state per session: read only by toBackupState() — see
// PerformanceReview.backup.ts.
export { toBackupState, backupStateFor, backupMark } from "./PerformanceReview.backup";
export type { BackupState, BackupMark, RawBackup } from "./PerformanceReview.backup";

// Which view Detail can show, and how each renders as a bookmark badge
// (color + icon, the 2-letter label kept as a fallback — see this element's own
// "Bookmarks are visually minimal by design" note in
// `updates/2026-10-28 PERFORMANCE-REVIEW - OPEN/wiki.md`). Lives here
// (page-specific data) rather than in BookmarkBadge/BookmarkRail/SplitRail
// themselves, which are generic over any kind set — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md` for why.
// Notes isn't one of them: it always sits in the Hero under the video.
export type ContentKind = "questions" | "clientCard" | "scorecard" | "transcript";

export const CONTENT_KIND_ORDER: ContentKind[] = ["questions", "clientCard", "scorecard", "transcript"];

export const CONTENT_KIND_META: Record<ContentKind, BookmarkMeta> = {
  questions: { label: "QA", name: "Question Analysis", icon: QuestionsIcon, color: "var(--color-bookmark-questions)" },
  clientCard: { label: "CC", name: "Client Card", icon: ClientCardIcon, color: "var(--color-bookmark-client-card)" },
  scorecard: { label: "SC", name: "Scorecard", icon: ScorecardIcon, color: "var(--color-bookmark-scorecard)" },
  transcript: { label: "TR", name: "Transcript", icon: TranscriptIcon, color: "var(--color-bookmark-transcript)" },
};

// The record list's order: newest meeting date on top (records carry no
// separate "added at" time — the meeting date is what the list has always
// sorted by). Shared by Navigation's list and the page's default
// selection, so "the top item" and "the item selected on open" always
// agree. Ties fall back to the record id (a "<date> <title>" folder name).
export function compareNewestFirst(a: { date: string; id: string }, b: { date: string; id: string }): number {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}

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
  // null until "Generate Question Analysis" has been run at least once.
  questionAnalysis: QuestionAnalysis | null;
  // null until "Generate Client Card" has been run at least once.
  clientCard: ClientCard | null;
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
  // Whether the user has personally reviewed/analyzed this call.
  reviewed: boolean;
  // How many times this record has been opened — tracked for later use.
  openCount: number;
  // null until "Generate Scorecard" has been run at least once.
  scorecard: Scorecard | null;
  // Whether this session's video is safely in OneDrive — see toBackupState().
  backup: BackupState;
};

// "Today", "Yesterday", "Tue 18 Nov", or "Tue 18 Nov 2025" outside this
// year. Takes an ISO yyyy-mm-dd; anything else is shown as-is.
export function humanDate(iso: string, now: Date = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";
  return date.toLocaleDateString("en-GB", options).replace(",", "");
}
