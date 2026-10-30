import type { DragEvent } from "react";
import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import position from "./AgentStrip.position.module.css";
import styles from "./AgentStrip.styles.module.css";

type AgentStripProps = {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
};

function handleDragStart(event: DragEvent<HTMLButtonElement>, agentId: string) {
  event.dataTransfer.setData("text/plain", agentId);
  event.dataTransfer.effectAllowed = "copy";
}

// Quick-access row above History — icon + name only (no description,
// that's still what AgentPicker's full "who do you want to chat with"
// list is for), ordered by AIAssistant.script.ts's orderAgentsByRecency
// so whoever you talked to most recently is first. Scrolls horizontally
// rather than wrapping or growing the panel's height. Still draggable
// (same agent-id dataTransfer AgentRosterItem used) so dropping one onto
// an existing chat to add them alongside keeps working.
export function AgentStrip({ agents, onSelectAgent }: AgentStripProps) {
  if (agents.length === 0) return null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {agents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          className={`${styles.item} ${position.item}`}
          data-construction
          onClick={() => onSelectAgent(agent.id)}
          draggable
          onDragStart={(event) => handleDragStart(event, agent.id)}
        >
          <AgentAvatar agent={agent} size={28} />
          <span className={`${styles.name} ${position.name}`} data-construction>
            {agent.name}
          </span>
        </button>
      ))}
    </div>
  );
}
