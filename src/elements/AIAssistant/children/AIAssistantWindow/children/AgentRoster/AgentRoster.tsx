import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentRosterItem } from "./children/AgentRosterItem/AgentRosterItem";
import position from "./AgentRoster.position.module.css";
import styles from "./AgentRoster.styles.module.css";

type AgentRosterProps = {
  agents: Agent[];
  onSelect: (id: string) => void;
};

// The Sidebar's "Agents" tab renders this as its sole content, so the
// section title lives on the tab itself — no label repeated in here.
export function AgentRoster({ agents, onSelect }: AgentRosterProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {agents.map((agent) => (
        <AgentRosterItem key={agent.id} agent={agent} onSelect={() => onSelect(agent.id)} />
      ))}
    </div>
  );
}
