// Tiny cross-component store — no new dependency, same shape as a
// minimal external store. Exists because a page (Performance Review,
// Training Room) and AIAssistant (mounted globally in layout.tsx, a
// sibling, not an ancestor/descendant) need to share "which taggable
// resource is currently open" without a shared React tree or prop
// drilling. PerformanceReview.script.ts/TrainingRoom.script.ts call
// setActiveTaggedResource on every selection change (and on unmount,
// with null); AIAssistant.script.ts reads it via the hook below to
// compute the active chat session's "suggested" tag. One slot only —
// a user is only ever looking at one taggable page at a time, so there's
// never a need for more than one resource "in view" at once.

"use client";

import { useSyncExternalStore } from "react";
import type { TaggedResourceKind } from "./types";

export type ActiveTaggedResource = { kind: TaggedResourceKind; id: string };

type Listener = () => void;

let current: ActiveTaggedResource | null = null;
const listeners = new Set<Listener>();

function sameResource(a: ActiveTaggedResource | null, b: ActiveTaggedResource | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

export function setActiveTaggedResource(resource: ActiveTaggedResource | null): void {
  if (sameResource(resource, current)) return;
  current = resource;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ActiveTaggedResource | null {
  return current;
}

export function useActiveTaggedResource(): ActiveTaggedResource | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
