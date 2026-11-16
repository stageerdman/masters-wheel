"use client";

import type { FrameTemplate } from "@/lib/frameDrills";
import position from "./SaveTemplateMenu.position.module.css";
import styles from "./SaveTemplateMenu.styles.module.css";

type SaveTemplateMenuProps = {
  templates: FrameTemplate[];
  // null = save as a new template; otherwise overwrite that template.
  onSave: (targetId: string | null) => void;
};

// The save-as-template popover's content: one primary "new template"
// action, then every existing template as a "replace this one" choice.
export function SaveTemplateMenu({ templates, onSave }: SaveTemplateMenuProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.newButton} ${position.newButton}`}
        data-construction
        onClick={() => onSave(null)}
        autoFocus
      >
        Save as new template
      </button>
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
                onClick={() => onSave(template.id)}
                title={template.text}
              >
                {template.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
