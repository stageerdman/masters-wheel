import { useDateRangeFilter } from "./DateRangeFilter.script";
import { DateRangePopup } from "./children/DateRangePopup/DateRangePopup";
import position from "./DateRangeFilter.position.module.css";
import styles from "./DateRangeFilter.styles.module.css";

export function DateRangeFilter() {
  const { chipRef, open, anchorRect, label, activePreset, range, close, toggleOpen, selectPreset, selectDate } =
    useDateRangeFilter();

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={toggleOpen}
        aria-expanded={open}
      >
        {label}
        <span className={styles.chevron} data-construction>
          ⌄
        </span>
      </button>
      {open && anchorRect && (
        <DateRangePopup
          anchorRect={anchorRect}
          activePreset={activePreset}
          range={range}
          onSelectPreset={selectPreset}
          onSelectDate={selectDate}
          onClose={close}
        />
      )}
    </>
  );
}
