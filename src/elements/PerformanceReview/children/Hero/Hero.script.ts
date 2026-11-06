"use client";

import { useEffect, useState } from "react";
import { CONTENT_KIND_ORDER, type ContentKind } from "@/elements/PerformanceReview/PerformanceReview.data";

const VALID_KINDS = CONTENT_KIND_ORDER;

// Which bookmark tab the Hero's text view shows is a UI preference, not
// per-record data — it persists across reloads (same pattern as Detail's
// split layout, see src/lib/splitRail.ts) shared across every record
// rather than resetting each time you switch or reopen one.
const ACTIVE_KIND_STORAGE_KEY = "performance-review-hero-active-kind";

function loadActiveKind(): ContentKind | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KIND_STORAGE_KEY);
    if (raw && (VALID_KINDS as string[]).includes(raw)) return raw as ContentKind;
  } catch {
    // Storage unavailable or malformed — fall back to the built-in default.
  }
  return null;
}

function saveActiveKind(kind: ContentKind) {
  try {
    localStorage.setItem(ACTIVE_KIND_STORAGE_KEY, kind);
  } catch {
    // Storage disabled (e.g. private browsing) — the selection just won't persist.
  }
}

export function usePersistedActiveKind() {
  const [active, setActiveState] = useState<ContentKind>("ai");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount — a one-time read from a
  // non-reactive external store, not the cascading-update pattern this
  // rule otherwise guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadActiveKind();
    if (saved) setActiveState(saved);
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist whenever the selection changes, gated on hydration having
  // finished so the initial default doesn't overwrite a saved selection
  // before it's had a chance to load.
  useEffect(() => {
    if (!isHydrated) return;
    saveActiveKind(active);
  }, [isHydrated, active]);

  return [active, setActiveState] as const;
}
