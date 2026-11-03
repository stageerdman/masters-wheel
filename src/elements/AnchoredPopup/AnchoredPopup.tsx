import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { ANCHORED_POPUP_ATTRIBUTE } from "@/lib/useAnchoredPopup";
import position from "./AnchoredPopup.position.module.css";
import styles from "./AnchoredPopup.styles.module.css";

type AnchoredPopupProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  children: ReactNode;
};

// Keeps the anchored panel fully on-screen — without this, an anchor near
// the right/bottom edge (e.g. SpaceSwitcher's top-right trigger) renders
// most of the panel off-viewport. Same constant/technique as ContextMenu's
// own cursor-position clamp.
const VIEWPORT_MARGIN = 8;

// The glass popup shell shared by every filter chip's dropdown — a
// transparent full-viewport backdrop (click to close) plus the actual
// panel, positioned from the chip's own bounding rect (then clamped to the
// viewport once its real size is known). Rendered inline in the tree (no
// portal): position: fixed already escapes to the viewport regardless of
// DOM depth, the same backdrop technique the upload/transcript modals
// already use elsewhere in this app.
export function AnchoredPopup({ anchorRect, onClose, children }: AnchoredPopupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: anchorRect.bottom + 8, left: anchorRect.left });

  // Runs synchronously before paint, so the clamp never produces a visible
  // jump — same shape as ContextMenu's own useLayoutEffect clamp.
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const clampedLeft = Math.max(VIEWPORT_MARGIN, Math.min(anchorRect.left, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const clampedTop = Math.max(VIEWPORT_MARGIN, Math.min(anchorRect.bottom + 8, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    setPos({ top: clampedTop, left: clampedLeft });
  }, [anchorRect]);

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        ref={rootRef}
        className={`${styles.root} ${position.root}`}
        data-construction
        {...{ [ANCHORED_POPUP_ATTRIBUTE]: true }}
        style={{ top: pos.top, left: pos.left }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
