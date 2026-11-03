"use client";

import { useState } from "react";
import { SpaceIcon } from "@/elements/SpaceIcon/SpaceIcon";
import { SPACE_ICON_IDS } from "@/elements/SpaceIcon/icons";
import type { Space } from "@/lib/spaces";
import position from "./EditSpaceModal.position.module.css";
import styles from "./EditSpaceModal.styles.module.css";

type EditSpaceModalProps = {
  space: Space;
  onClose: () => void;
  onSave: (name: string, icon: string) => Promise<void>;
};

// Rename + change icon for an existing Space, opened via its right-click
// context menu. Same shape as CreateSpaceModal, pre-filled instead of
// blank — kept as its own component rather than a create/edit mode on one
// shared component, since the two flows differ enough (a name change here
// renames a real on-disk folder — see registry.ts's renameSpace) that
// branching one component's props would obscure more than it'd save.
export function EditSpaceModal({ space, onClose, onSave }: EditSpaceModalProps) {
  const [name, setName] = useState(space.name);
  const [icon, setIcon] = useState(space.icon);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = name.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    await onSave(name, icon);
  }

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div className={`${styles.root} ${position.root}`} data-construction onClick={(event) => event.stopPropagation()}>
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Edit Space
          </h2>
          <button type="button" className={`${styles.closeButton} ${position.closeButton}`} data-construction onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <input
          type="text"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSave();
          }}
          placeholder="Space name"
          className={`${styles.nameInput} ${position.nameInput}`}
          data-construction
        />

        <div className={`${styles.iconGrid} ${position.iconGrid}`} data-construction role="radiogroup" aria-label="Icon">
          {SPACE_ICON_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={icon === id}
              className={`${styles.iconOption} ${position.iconOption} ${icon === id ? styles.iconOptionSelected : ""}`}
              data-construction
              onClick={() => setIcon(id)}
            >
              <SpaceIcon icon={id} size={22} />
            </button>
          ))}
        </div>

        <button type="button" disabled={!canSave} className={`${styles.saveButton} ${position.saveButton}`} data-construction onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
