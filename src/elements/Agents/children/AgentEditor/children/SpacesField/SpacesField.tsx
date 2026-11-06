"use client";

import type { Space } from "@/lib/spaces";
import position from "./SpacesField.position.module.css";
import styles from "./SpacesField.styles.module.css";

type SpacesFieldProps = {
  spaces: Space[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

// Lets an agent be narrowed down from its default "visible in every Space"
// to just the ones picked here — see src/lib/agents/types.ts's
// availableSpaceIds. Refuses to let the last selected Space be unchecked:
// an agent visible nowhere would just silently vanish from every roster,
// which is never what unchecking the last box means.
export function SpacesField({ spaces, selectedIds, onChange }: SpacesFieldProps) {
  function toggle(id: string) {
    const isSelected = selectedIds.includes(id);
    if (isSelected && selectedIds.length === 1) return;
    onChange(isSelected ? selectedIds.filter((candidate) => candidate !== id) : [...selectedIds, id]);
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction>
        Available in
      </span>
      <div className={`${position.chipRow}`} data-construction>
        {spaces.map((space) => {
          const isSelected = selectedIds.includes(space.id);
          return (
            <button
              key={space.id}
              type="button"
              className={`${styles.chip} ${position.chip} ${isSelected ? styles.chipSelected : ""}`}
              data-construction
              aria-pressed={isSelected}
              onClick={() => toggle(space.id)}
            >
              {space.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
