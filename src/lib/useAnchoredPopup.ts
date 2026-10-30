import { useCallback, useEffect, useRef, useState } from "react";

// Shared by every glass chip that opens a popup anchored to itself
// (DateRangeFilter, AddFilterButton, SessionTypeFilter) — the open/close,
// anchor-rect, scroll-dismiss, and Escape-dismiss mechanics, so each chip
// only has to own its own popup *content*. Closing on scroll rather than
// repositioning live is a deliberate choice (see the Analytics update's
// wiki.md) — a popover anchored to a scrolled-away chip reads as broken.
//
// Every popup built on this hook must mark its own panel with
// ANCHORED_POPUP_ATTRIBUTE (see AnchoredPopup), so the scroll-dismiss
// listener can tell scrolling *inside* a popup (a long options list) apart
// from the page behind it scrolling.
export const ANCHORED_POPUP_ATTRIBUTE = "data-anchored-popup";

export function useAnchoredPopup<T extends HTMLElement = HTMLButtonElement>() {
  const anchorRef = useRef<T>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback(() => {
    setOpen((current) => {
      if (!current) setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);
      return !current;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleScroll(event: Event) {
      const target = event.target;
      if (target instanceof Element && target.closest(`[${ANCHORED_POPUP_ATTRIBUTE}]`)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return { anchorRef, open, anchorRect, toggleOpen, close };
}
