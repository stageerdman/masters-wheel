"use client";

import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import type { SessionTypeFilter as SessionTypeFilterValue } from "@/lib/statistics/filters";
import { SessionTypeFilterPopup } from "./children/SessionTypeFilterPopup/SessionTypeFilterPopup";
import position from "./SessionTypeFilter.position.module.css";
import styles from "./SessionTypeFilter.styles.module.css";

type SessionTypeFilterProps = {
  value: SessionTypeFilterValue;
  onChange: (value: SessionTypeFilterValue) => void;
  onRemove: () => void;
};

export function SessionTypeFilter({ value, onChange, onRemove }: SessionTypeFilterProps) {
  const { anchorRef, open, anchorRect, toggleOpen, close } = useAnchoredPopup<HTMLButtonElement>();

  return (
    <>
      <span className={`${styles.root} ${position.root}`} data-construction>
        <button
          ref={anchorRef}
          type="button"
          className={`${styles.chip} ${position.chip}`}
          data-construction
          onClick={toggleOpen}
          aria-expanded={open}
        >
          {value.values.length > 0 ? `Session type (${value.values.length})` : "Session type"}
        </button>
        <button
          type="button"
          className={`${styles.removeButton} ${position.removeButton}`}
          data-construction
          onClick={onRemove}
          aria-label="Remove session type filter"
        >
          ×
        </button>
      </span>
      {open && anchorRect && (
        <SessionTypeFilterPopup anchorRect={anchorRect} value={value} onChange={onChange} onClose={close} />
      )}
    </>
  );
}
