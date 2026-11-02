// Pure tag-list operations — AIAssistant.script.ts calls these and
// decides when to persist the result; nothing here touches React state
// or disk itself.

import type { PerformanceReviewTag } from "./types";

// Replaces whatever tag was previously "suggested" with one for
// `activeRecordId` — never touches an "active" tag, and adds nothing if
// that record is already tagged (active or suggested) or there's no
// Performance Review page currently open at all. At most one "suggested"
// tag ever exists in the result.
export function withSuggestedTag(
  tags: PerformanceReviewTag[],
  activeRecordId: string | null,
): PerformanceReviewTag[] {
  const withoutSuggested = tags.filter((tag) => tag.kind !== "suggested");
  if (!activeRecordId) return withoutSuggested;
  if (withoutSuggested.some((tag) => tag.recordId === activeRecordId)) return withoutSuggested;
  return [...withoutSuggested, { recordId: activeRecordId, kind: "suggested" }];
}

// The × button's action — drops a tag regardless of kind.
export function removeTag(tags: PerformanceReviewTag[], recordId: string): PerformanceReviewTag[] {
  return tags.filter((tag) => tag.recordId !== recordId);
}

// A "suggested" tag the AI actually reads becomes "active" — sticks
// around across page navigation from then on. No-op if the record isn't
// tagged at all (shouldn't happen — see mcp/permission.rs's gating) or
// is already active.
// Phase C calls this when the AI actually reads a record that was only
// a computed suggestion (never stored) or already active — either way,
// the result is one stored "active" entry for that record, no duplicates.
export function promoteTag(tags: PerformanceReviewTag[], recordId: string): PerformanceReviewTag[] {
  if (tags.some((tag) => tag.recordId === recordId)) {
    return tags.map((tag) => (tag.recordId === recordId ? { ...tag, kind: "active" } : tag));
  }
  return [...tags, { recordId, kind: "active" }];
}
