// Pure tag-list operations — AIAssistant.script.ts calls these and
// decides when to persist the result; nothing here touches React state
// or disk itself. Generalized from Performance-Review-only (bare
// `recordId`) once Training Room sessions became a second real
// consumer — every match is now on the (resourceKind, resourceId) pair.

import type { ChatTag, TaggedResourceKind } from "./types";

function sameResource(tag: ChatTag, resourceKind: TaggedResourceKind, resourceId: string): boolean {
  return tag.resourceKind === resourceKind && tag.resourceId === resourceId;
}

// Replaces whatever tag was previously "suggested" with one for the
// given resource — never touches an "active" tag, and adds nothing if
// that resource is already tagged (active or suggested) or there's
// nothing currently active to suggest. At most one "suggested" tag ever
// exists in the result.
export function withSuggestedTag(
  tags: ChatTag[],
  suggested: { kind: TaggedResourceKind; id: string } | null,
): ChatTag[] {
  const withoutSuggested = tags.filter((tag) => tag.state !== "suggested");
  if (!suggested) return withoutSuggested;
  if (withoutSuggested.some((tag) => sameResource(tag, suggested.kind, suggested.id))) return withoutSuggested;
  return [...withoutSuggested, { resourceKind: suggested.kind, resourceId: suggested.id, state: "suggested" }];
}

// The × button's action — drops a tag regardless of state.
export function removeTag(tags: ChatTag[], resourceKind: TaggedResourceKind, resourceId: string): ChatTag[] {
  return tags.filter((tag) => !sameResource(tag, resourceKind, resourceId));
}

// A "suggested" tag the AI actually reads becomes "active" — sticks
// around across page navigation from then on. No-op if the resource
// isn't tagged at all (shouldn't happen — see mcp/permission.rs's
// gating) or is already active.
export function promoteTag(tags: ChatTag[], resourceKind: TaggedResourceKind, resourceId: string): ChatTag[] {
  if (tags.some((tag) => sameResource(tag, resourceKind, resourceId))) {
    return tags.map((tag) => (sameResource(tag, resourceKind, resourceId) ? { ...tag, state: "active" } : tag));
  }
  return [...tags, { resourceKind, resourceId, state: "active" }];
}
