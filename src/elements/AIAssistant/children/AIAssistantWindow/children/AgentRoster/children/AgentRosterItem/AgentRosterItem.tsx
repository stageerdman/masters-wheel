import type { DragEvent } from "react";
import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import { agentDescription } from "@/lib/agents";
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
      <AgentAvatar agent={agent} size={24} />
      <span className={`${position.text}`} data-construction>
        <span className={styles.name} data-construction>
          {agent.name}
        </span>
        <span className={`${styles.tagline} ${position.tagline}`} data-construction>
          {agentDescription(agent)}
        </span>
      </span>
    </button>
  );
}
