import type { DateRange, PresetId } from "@/elements/StatFilterBar/children/DateRangeFilter/DateRangeFilter.script";
import { Calendar } from "./children/Calendar/Calendar";
import { PresetList } from "./children/PresetList/PresetList";
import position from "./DateRangePopup.position.module.css";
import styles from "./DateRangePopup.styles.module.css";

type DateRangePopupProps = {
  anchorRect: DOMRect;
  activePreset: PresetId | null;
  range: DateRange;
  onSelectPreset: (presetId: PresetId) => void;
  onSelectDate: (which: "start" | "end", iso: string) => void;
  onClose: () => void;
};

export function DateRangePopup({
  anchorRect,
  activePreset,
  range,
  onSelectPreset,
  onSelectDate,
  onClose,
}: DateRangePopupProps) {
  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
        onClick={(event) => event.stopPropagation()}
      >
        <PresetList activePreset={activePreset} onSelect={onSelectPreset} />
        <Calendar label="Start date" value={range.start} onSelect={(iso) => onSelectDate("start", iso)} />
        <Calendar label="End date" value={range.end} onSelect={(iso) => onSelectDate("end", iso)} />
      </div>
    </div>
  );
}
