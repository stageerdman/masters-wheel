import type { ReactNode } from "react";
import { ANCHORED_POPUP_ATTRIBUTE } from "@/lib/useAnchoredPopup";
import position from "./AnchoredPopup.position.module.css";
import styles from "./AnchoredPopup.styles.module.css";

type AnchoredPopupProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  children: ReactNode;
};

// The glass popup shell shared by every filter chip's dropdown — a
// transparent full-viewport backdrop (click to close) plus the actual
// panel, positioned from the chip's own bounding rect. Rendered inline in
// the tree (no portal): position: fixed already escapes to the viewport
// regardless of DOM depth, the same backdrop technique the upload/
// transcript modals already use elsewhere in this app.
export function AnchoredPopup({ anchorRect, onClose, children }: AnchoredPopupProps) {
  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        {...{ [ANCHORED_POPUP_ATTRIBUTE]: true }}
        style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
