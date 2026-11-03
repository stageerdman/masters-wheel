"use client";

import { useState } from "react";
import { SpaceIcon } from "@/elements/SpaceIcon/SpaceIcon";
import { DEFAULT_SPACE_ICON_ID, SPACE_ICON_IDS } from "@/elements/SpaceIcon/icons";
import position from "./CreateSpaceModal.position.module.css";
import styles from "./CreateSpaceModal.styles.module.css";

type CreateSpaceModalProps = {
  onClose: () => void;
  onCreate: (name: string, icon: string) => Promise<void>;
};

// Name + icon picker, then immediately switches into the new (empty)
// Space — see SpacesProvider.createSpace, which both creates and sets it
// active in one call. Same backdrop+root modal shape as VideoUploadModal.
export function CreateSpaceModal({ onClose, onCreate }: CreateSpaceModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_SPACE_ICON_ID);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = name.trim().length > 0 && !isCreating;

  async function handleCreate() {
    if (!canCreate) return;
    setIsCreating(true);
    await onCreate(name, icon);
  }

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div className={`${styles.root} ${position.root}`} data-construction onClick={(event) => event.stopPropagation()}>
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            New Space
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
            if (event.key === "Enter") void handleCreate();
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

        <button
          type="button"
          disabled={!canCreate}
          className={`${styles.createButton} ${position.createButton}`}
          data-construction
          onClick={handleCreate}
        >
          Create Space
        </button>
      </div>
    </div>
  );
}
