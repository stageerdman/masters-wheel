"use client";

import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import type { FilterTypeId } from "../../StatFilterBar.script";
import { AddFilterMenu } from "./children/AddFilterMenu/AddFilterMenu";
import position from "./AddFilterButton.position.module.css";
import styles from "./AddFilterButton.styles.module.css";

type AddFilterButtonProps = {
  availableFilterTypes: { id: FilterTypeId; label: string }[];
  onAddFilter: (type: FilterTypeId) => void;
};

export function AddFilterButton({ availableFilterTypes, onAddFilter }: AddFilterButtonProps) {
  const { anchorRef, open, anchorRect, toggleOpen, close } = useAnchoredPopup<HTMLButtonElement>();

  if (availableFilterTypes.length === 0) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label="Add filter"
      >
        ▽
      </button>
      {open && anchorRect && (
        <AddFilterMenu
          anchorRect={anchorRect}
          filterTypes={availableFilterTypes}
          onSelect={(type) => {
            onAddFilter(type);
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}
