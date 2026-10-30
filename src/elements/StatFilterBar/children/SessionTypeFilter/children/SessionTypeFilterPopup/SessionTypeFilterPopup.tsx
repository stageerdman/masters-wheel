import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import { CALL_STATE_META, CALL_STATE_ORDER } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { SessionTypeFilter } from "@/lib/statistics/filters";
import position from "./SessionTypeFilterPopup.position.module.css";
import styles from "./SessionTypeFilterPopup.styles.module.css";

type SessionTypeFilterPopupProps = {
  anchorRect: DOMRect;
  value: SessionTypeFilter;
  onChange: (value: SessionTypeFilter) => void;
  onClose: () => void;
};

// The list of selectable "kinds of sessions" is read straight off
// CALL_STATE_ORDER/CALL_STATE_META — the same registry Performance Review
// itself uses for call states. Add or remove a call state there and this
// filter's options follow automatically; nothing here is a second,
// hand-kept list that could drift out of sync.
export function SessionTypeFilterPopup({ anchorRect, value, onChange, onClose }: SessionTypeFilterPopupProps) {
  function toggleMode() {
    onChange({ ...value, mode: value.mode === "contains" ? "excludes" : "contains" });
  }

  function toggleValue(state: string) {
    const values = value.values.includes(state)
      ? value.values.filter((existing) => existing !== state)
      : [...value.values, state];
    onChange({ ...value, values });
  }

  return (
    <AnchoredPopup anchorRect={anchorRect} onClose={onClose}>
      <div className={position.root} data-construction>
        <button type="button" className={`${styles.modeButton} ${position.modeButton}`} data-construction onClick={toggleMode}>
          {value.mode === "contains" ? "Contains" : "Doesn't contain"}
        </button>
        <div className={position.optionList} data-construction>
          {CALL_STATE_ORDER.map((state) => {
            const checked = value.values.includes(state);
            return (
              <button
                key={state}
                type="button"
                className={`${styles.option} ${position.option}`}
                data-construction
                onClick={() => toggleValue(state)}
                aria-pressed={checked}
              >
                <span
                  className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ""}`}
                  data-construction
                  style={{ "--icon-color": CALL_STATE_META[state].color } as React.CSSProperties}
                >
                  {checked ? "✓" : ""}
                </span>
                {CALL_STATE_META[state].label}
              </button>
            );
          })}
        </div>
      </div>
    </AnchoredPopup>
  );
}
