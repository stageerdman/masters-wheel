"use client";

import { useState } from "react";
import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { resolveRespondedAgents } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import { ContextUsageGauge } from "@/elements/ContextUsageGauge/ContextUsageGauge";
import { summarizeContextUsage } from "@/lib/chat";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import position from "./HistoryListItem.position.module.css";
import styles from "./HistoryListItem.styles.module.css";

type HistoryListItemProps = {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  agents: Agent[];
};

export function HistoryListItem({ session, active, onSelect, onDelete, agents }: HistoryListItemProps) {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  // Who's actually in this conversation — every distinct agent that has
  // replied, not just the chat's dedicated one — so a thread where you
  // @mentioned someone else in too shows that here, in history, instead
  // of a persistent chip in the live chat view (dropped — see AIAssistant.script.ts).
  const respondedAgents = resolveRespondedAgents(session, agents);

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setMenuPosition({ x: event.clientX, y: event.clientY });
  }

  function handleDelete() {
    if (window.confirm(`Delete "${session.title}"? This can't be undone.`)) onDelete();
  }

  const menuItems: ContextMenuItem[] = [
    { id: "delete", label: "Delete chat", onSelect: handleDelete, destructive: true },
  ];

  return (
    <>
      <button
        type="button"
        className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
        data-construction
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        aria-pressed={active}
      >
        <span className={styles.title} data-construction>
          {session.title}
        </span>
        <span className={`${position.meta}`} data-construction>
          <span className={styles.date} data-construction>
            {formatRelativeTime(session.updatedAt)}
          </span>
          {respondedAgents.map((agent) => (
            <AgentAvatar key={agent.id} agent={agent} size={14} />
          ))}
        </span>
      </button>
      {menuPosition && (
        <ContextMenu
          x={menuPosition.x}
          y={menuPosition.y}
          items={menuItems}
          onClose={() => setMenuPosition(null)}
          header={<ContextUsageGauge usage={summarizeContextUsage(session)} />}
        />
      )}
    </>
  );
}
