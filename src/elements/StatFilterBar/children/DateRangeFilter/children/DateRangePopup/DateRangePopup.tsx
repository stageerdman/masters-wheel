import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import type { DateRange } from "@/lib/statistics/filters";
import type { PresetId } from "../../DateRangeFilter.script";
import { Calendar } from "./children/Calendar/Calendar";
import { PresetList } from "./children/PresetList/PresetList";
import position from "./DateRangePopup.position.module.css";

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
    <AnchoredPopup anchorRect={anchorRect} onClose={onClose}>
      <div className={position.columns} data-construction>
        <PresetList activePreset={activePreset} onSelect={onSelectPreset} />
        <Calendar label="Start date" value={range.start} onSelect={(iso) => onSelectDate("start", iso)} />
        <Calendar label="End date" value={range.end} onSelect={(iso) => onSelectDate("end", iso)} />
      </div>
    </AnchoredPopup>
  );
}
