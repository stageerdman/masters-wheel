"use client";

import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import type { DateRange } from "@/lib/statistics/filters";
import { formatRangeLabel, type PresetId } from "./DateRangeFilter.script";
import { DateRangePopup } from "./children/DateRangePopup/DateRangePopup";
import position from "./DateRangeFilter.position.module.css";
import styles from "./DateRangeFilter.styles.module.css";

type DateRangeFilterProps = {
  activePreset: PresetId | null;
  range: DateRange;
  onSelectPreset: (presetId: PresetId) => void;
  onSelectDate: (which: "start" | "end", iso: string) => void;
};

export function DateRangeFilter({ activePreset, range, onSelectPreset, onSelectDate }: DateRangeFilterProps) {
  const { anchorRef, open, anchorRect, toggleOpen, close } = useAnchoredPopup<HTMLButtonElement>();

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={toggleOpen}
        aria-expanded={open}
      >
        {formatRangeLabel(activePreset, range)}
        <span className={styles.chevron} data-construction>
          ⌄
        </span>
      </button>
      {open && anchorRect && (
        <DateRangePopup
          anchorRect={anchorRect}
          activePreset={activePreset}
          range={range}
          onSelectPreset={(presetId) => {
            onSelectPreset(presetId);
            close();
          }}
          onSelectDate={onSelectDate}
          onClose={close}
        />
      )}
    </>
  );
}
