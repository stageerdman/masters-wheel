import type { DragEvent } from "react";
import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import position from "./AgentRosterItem.position.module.css";
import styles from "./AgentRosterItem.styles.module.css";

type AgentRosterItemProps = {
  agent: Agent;
  onSelect: () => void;
};

export function AgentRosterItem({ agent, onSelect }: AgentRosterItemProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("text/plain", agent.id);
    event.dataTransfer.effectAllowed = "copy";
  }

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root}`}
      data-construction
      onClick={onSelect}
      draggable
      onDragStart={handleDragStart}
    >
      <span className={`${styles.avatar} ${position.avatar}`} data-construction>
        {agent.initial}
      </span>
      <span className={`${position.text}`} data-construction>
        <span className={styles.name} data-construction>
          {agent.name}
        </span>
        <span className={`${styles.tagline} ${position.tagline}`} data-construction>
          {agent.tagline}
        </span>
      </span>
    </button>
  );
}
