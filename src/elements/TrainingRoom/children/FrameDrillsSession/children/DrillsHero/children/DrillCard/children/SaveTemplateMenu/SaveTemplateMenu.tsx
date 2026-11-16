"use client";

import { useState } from "react";
import type { FrameTemplate } from "@/lib/frameDrills";
import type { TemplateSaveTarget } from "@/elements/TrainingRoom/children/FrameDrillsSession/FrameDrillsSession.script";
import position from "./SaveTemplateMenu.position.module.css";
import styles from "./SaveTemplateMenu.styles.module.css";

type SaveTemplateMenuProps = {
  templates: FrameTemplate[];
  onSave: (target: TemplateSaveTarget) => void;
};

// The save-as-template popover's content: name a new template (Enter or
// Save), or pick an existing template by name to overwrite its text.
export function SaveTemplateMenu({ templates, onSave }: SaveTemplateMenuProps) {
  const [name, setName] = useState("");
  const canSave = name.trim().length > 0;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <form
        className={position.newForm}
        data-construction
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave({ kind: "new", name: name.trim() });
        }}
      >
        <input
          className={`${styles.nameInput} ${position.nameInput}`}
          data-construction
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Template name"
          aria-label="New template name"
          autoFocus
        />
        <button
          type="submit"
          className={`${styles.newButton} ${position.newButton}`}
          data-construction
          disabled={!canSave}
        >
          Save
        </button>
      </form>
      {templates.length > 0 && (
        <>
          <p className={`${styles.label} ${position.label}`} data-construction>
            Or replace an existing one
          </p>
          <div className={position.list} data-construction>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`${styles.option} ${position.option}`}
                data-construction
                onClick={() => onSave({ kind: "replace", id: template.id })}
                title={template.text}
              >
                {template.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
