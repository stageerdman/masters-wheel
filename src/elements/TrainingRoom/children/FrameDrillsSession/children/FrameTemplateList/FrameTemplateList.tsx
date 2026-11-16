"use client";

import { useState } from "react";
import { ContextMenu } from "@/elements/ContextMenu/ContextMenu";
import type { FrameTemplate } from "@/lib/frameDrills";
import position from "./FrameTemplateList.position.module.css";
import styles from "./FrameTemplateList.styles.module.css";

type FrameTemplateListProps = {
  templates: FrameTemplate[];
  onAdd: (template: FrameTemplate) => void;
  onDelete: (template: FrameTemplate) => void;
};

// Frame Drills' Detail "FR" pane: every saved frame in this Space. Click
// one to add it to the Hero as a new drill; right-click to delete it.
export function FrameTemplateList({ templates, onAdd, onDelete }: FrameTemplateListProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; template: FrameTemplate } | null>(null);

  if (templates.length === 0) {
    return (
      <p className={`${styles.empty} ${position.empty}`} data-construction>
        No saved frames yet. Save a drill with its bookmark icon to reuse it here.
      </p>
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          className={`${styles.item} ${position.item}`}
          data-construction
          onClick={() => onAdd(template)}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenu({ x: event.clientX, y: event.clientY, template });
          }}
          title="Add to drills"
        >
          {template.text}
        </button>
      ))}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[{ id: "delete", label: "Delete frame", tone: "destructive", onSelect: () => onDelete(menu.template) }]}
        />
      )}
    </div>
  );
}
