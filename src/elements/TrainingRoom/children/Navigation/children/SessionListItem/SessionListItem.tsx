"use client";

import { useState } from "react";
import { formatShortRelativeTime } from "@/lib/formatShortRelativeTime";
import { TOOL_TYPE_META, type TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./SessionListItem.position.module.css";
import styles from "./SessionListItem.styles.module.css";

type SessionListItemProps = {
  session: TrainingSession;
  active: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onRename: (name: string) => void;
};

// Same visual language as Performance Review's VideoListItem: one
// fixed-height row, type glyph on the left, two text rows on the right.
// The type glyph always comes from the session's tool type (TOOL_TYPE_META)
// — never user-adjustable, unlike the name.
export function SessionListItem({ session, active, onClick, onContextMenu, onRename }: SessionListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const meta = TOOL_TYPE_META[session.toolType];

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""} ${
        session.status === "closed" ? styles.closed : ""
      }`}
      data-construction
      onClick={onClick}
      onContextMenu={onContextMenu}
      aria-pressed={active}
      title={meta.description}
    >
      <span
        className={`${styles.icon} ${position.icon}`}
        data-construction
        style={{ "--icon-color": meta.color } as React.CSSProperties}
        aria-hidden="true"
      >
        {meta.glyph}
      </span>
      <span className={position.textRows} data-construction>
        {isEditing ? (
          <input
            className={`${styles.nameInput} ${position.nameInput}`}
            data-construction
            value={session.name}
            autoFocus
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onRename(event.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
            }}
            aria-label="Session name"
          />
        ) : (
          <span
            className={styles.name}
            data-construction
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
            title="Click to rename"
          >
            {session.name}
          </span>
        )}
        <span className={styles.date} data-construction>
          {formatShortRelativeTime(session.lastUsedAt)}
        </span>
      </span>
    </button>
  );
}
