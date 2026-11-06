"use client";

import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import type { TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { AddSessionListItem } from "./children/AddSessionListItem/AddSessionListItem";
import { SessionListItem } from "./children/SessionListItem/SessionListItem";
import position from "./Navigation.position.module.css";
import styles from "./Navigation.styles.module.css";

type NavigationProps = {
  openSessions: TrainingSession[];
  closedSessions: TrainingSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
};

type MenuTarget = { session: TrainingSession; x: number; y: number };

export function Navigation({
  openSessions,
  closedSessions,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onRemove,
  onClose,
  onReopen,
}: NavigationProps) {
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);

  function handleContextMenu(event: React.MouseEvent, session: TrainingSession) {
    event.preventDefault();
    setMenuTarget({ session, x: event.clientX, y: event.clientY });
  }

  function renderGroup(label: string, sessions: TrainingSession[]) {
    if (sessions.length === 0) return null;
    return (
      <li>
        <p className={`${styles.groupLabel} ${position.groupLabel}`} data-construction>
          {label}
        </p>
        <ul className={position.group} data-construction>
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionListItem
                session={session}
                active={session.id === selectedId}
                onClick={() => onSelect(session.id)}
                onContextMenu={(event) => handleContextMenu(event, session)}
                onRename={(name) => onRename(session.id, name)}
              />
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <nav className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.addSlot} data-construction>
        <AddSessionListItem onAdd={onAdd} />
      </div>
      <ul className={`${styles.list} ${position.list}`} data-construction>
        {renderGroup("Open Sessions", openSessions)}
        {renderGroup("Closed Sessions", closedSessions)}
      </ul>
      {menuTarget && (
        <ContextMenu
          x={menuTarget.x}
          y={menuTarget.y}
          onClose={() => setMenuTarget(null)}
          items={buildMenuItems(menuTarget.session, { onRemove, onClose, onReopen })}
        />
      )}
    </nav>
  );
}

function buildMenuItems(
  session: TrainingSession,
  handlers: { onRemove: (id: string) => void; onClose: (id: string) => void; onReopen: (id: string) => void }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  if (session.status === "open") {
    items.push({
      id: "close",
      label: "Close session",
      onSelect: () => handlers.onClose(session.id),
      tone: "positive",
    });
  } else {
    items.push({ id: "reopen", label: "Reopen session", onSelect: () => handlers.onReopen(session.id) });
  }
  items.push({
    id: "remove",
    label: "Remove session",
    onSelect: () => handlers.onRemove(session.id),
    tone: "destructive",
  });
  return items;
}
