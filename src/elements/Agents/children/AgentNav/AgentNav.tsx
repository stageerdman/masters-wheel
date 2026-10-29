"use client";

import type { CoachAgent } from "@/elements/Agents/Agents.data";
import { AgentNavItem } from "./children/AgentNavItem/AgentNavItem";
import position from "./AgentNav.position.module.css";
import styles from "./AgentNav.styles.module.css";

type AgentNavProps = {
  agents: CoachAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddAgent: () => void;
};

export function AgentNav({ agents, selectedId, onSelect, onAddAgent }: AgentNavProps) {
  return (
    <nav className={`${styles.root} ${position.root}`} data-construction>
      <ul className={`${styles.list} ${position.list}`} data-construction>
        <li>
          <AgentNavItem agent={null} active={false} onClick={onAddAgent} />
        </li>
        {agents.map((agent) => (
          <li key={agent.id}>
            <AgentNavItem agent={agent} active={agent.id === selectedId} onClick={() => onSelect(agent.id)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
