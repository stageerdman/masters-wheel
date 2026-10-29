import { useEffect } from "react";

// A real timer tied to the "just saved" event (not a prop-sync effect) —
// clears the "Saved" confirmation 1.2s after it was set.
export function useSavedConfirmation(savedAt: number | null, setSavedAt: (value: number | null) => void) {
  useEffect(() => {
    if (savedAt === null) return;
    const timeout = setTimeout(() => setSavedAt(null), 1200);
    return () => clearTimeout(timeout);
  }, [savedAt, setSavedAt]);
}
