// Tiny cross-component store — no new dependency, same shape as a
// minimal external store. Exists because PerformanceReview (a route) and
// AIAssistant (mounted globally in layout.tsx, a sibling, not an
// ancestor/descendant) need to share "which record is currently open in
// Performance Review" without a shared React tree or prop drilling.
// PerformanceReview.script.ts calls setActiveRecord on every selectedId
// change (and on unmount, with null); AIAssistant.script.ts reads it via
// the hook below to compute the active chat session's "suggested" tag.

"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

let current: string | null = null;
const listeners = new Set<Listener>();

export function setActiveRecord(recordId: string | null): void {
  if (recordId === current) return;
  current = recordId;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  return current;
}

export function useActiveRecord(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
