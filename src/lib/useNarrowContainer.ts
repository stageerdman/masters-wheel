import { useEffect, useState } from "react";
import type { RefObject } from "react";

// Tracks whether a node's own inline-size has dropped at or below
// `maxWidth` — a JS-side mirror of a CSS `@container (max-width: ...)`
// query, for the rare case where a layout decision driven by that same
// breakpoint can't be expressed in CSS alone (e.g. AIAssistantWindow
// auto-closing its sidebar on navigation only once the sidebar has
// become a full-width overlay, not a side-by-side column — see its own
// `@container window-content (max-width: 480px)` rule, which this
// threshold must stay in sync with).
export function useNarrowContainer(ref: RefObject<HTMLElement | null>, maxWidth: number): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width <= maxWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, maxWidth]);

  return isNarrow;
}
