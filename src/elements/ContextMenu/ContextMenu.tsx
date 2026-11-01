"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import position from "./ContextMenu.position.module.css";
import styles from "./ContextMenu.styles.module.css";

export type ContextMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  /** Optional non-interactive content shown above the action items —
   * e.g. HistoryListItem's context-usage gauge. Most callers (this
   * element's only other user, PerformanceReview) omit it entirely. */
  header?: ReactNode;
};

// Keeps the menu's cursor-anchored position fully on-screen — without
// this, a right-click near the bottom/right edge of the window renders
// most of the menu off-viewport (unreachable, invisible options).
const VIEWPORT_MARGIN = 8;

// A minimal right-click popup menu, positioned at the triggering cursor
// coordinates (then clamped to the viewport once its real size is known).
// Closes itself on an outside click or Escape — the caller only owns
// *whether* it's open, *where* it was triggered, and what its items do.
export function ContextMenu({ x, y, items, onClose, header }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Runs synchronously before paint, so the clamp never produces a visible
  // jump — the menu is measured and repositioned in the same frame it
  // first renders at the raw cursor coordinates.
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const clampedX = Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const clampedY = Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    setPos({ x: clampedX, y: clampedY });
  }, [x, y]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Portaled to `document.body` rather than rendered in place — `position:
  // fixed` is only viewport-relative when nothing between this node and
  // the viewport sets `transform` (or similar); AIAssistantWindow's root
  // always has one (every dock state translates it), which would otherwise
  // make that window the containing block and clip this menu to its own
  // bounds instead of the real viewport.
  return createPortal(
    <div
      ref={rootRef}
      className={`${styles.root} ${position.root}`}
      data-construction
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      {header && (
        <div className={`${styles.header} ${position.header}`} data-construction>
          {header}
        </div>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`${styles.item} ${position.item} ${item.destructive ? styles.destructive : ""}`}
          data-construction
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
