import { PRESETS, type PresetId } from "@/elements/StatFilterBar/children/DateRangeFilter/DateRangeFilter.script";
import position from "./PresetList.position.module.css";
import styles from "./PresetList.styles.module.css";

type PresetListProps = {
  activePreset: PresetId | null;
  onSelect: (presetId: PresetId) => void;
};

export function PresetList({ activePreset, onSelect }: PresetListProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`${styles.option} ${position.option} ${
            preset.id === activePreset ? styles.optionSelected : ""
          }`}
          data-construction
          onClick={() => onSelect(preset.id)}
          aria-pressed={preset.id === activePreset}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
