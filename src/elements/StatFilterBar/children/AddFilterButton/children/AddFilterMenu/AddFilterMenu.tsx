import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import type { FilterTypeId } from "../../../../StatFilterBar.script";
import position from "./AddFilterMenu.position.module.css";
import styles from "./AddFilterMenu.styles.module.css";

type AddFilterMenuProps = {
  anchorRect: DOMRect;
  filterTypes: { id: FilterTypeId; label: string }[];
  onSelect: (type: FilterTypeId) => void;
  onClose: () => void;
};

// A plain scrollable list — there's only one filter type today (Session
// type), but the list itself doesn't assume that; a second filter type
// just becomes another row here.
export function AddFilterMenu({ anchorRect, filterTypes, onSelect, onClose }: AddFilterMenuProps) {
  return (
    <AnchoredPopup anchorRect={anchorRect} onClose={onClose}>
      <div className={position.root} data-construction>
        {filterTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`${styles.option} ${position.option}`}
            data-construction
            onClick={() => onSelect(type.id)}
          >
            {type.label}
          </button>
        ))}
      </div>
    </AnchoredPopup>
  );
}
