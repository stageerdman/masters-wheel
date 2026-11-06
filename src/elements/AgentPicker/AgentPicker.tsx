import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentRosterItem } from "./children/AgentRosterItem/AgentRosterItem";
import position from "./AgentPicker.position.module.css";
import styles from "./AgentPicker.styles.module.css";

type AgentPickerProps = {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
};

// Shown in place of MessageList + Composer while the active session is a
// fresh draft (see AIAssistant.script.ts's isDraftSession) — picking an
// agent is the first thing a new chat asks for now, not something you had
// to dig into the Sidebar's Agents tab to find.
export function AgentPicker({ agents, onSelectAgent }: AgentPickerProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <p className={`${styles.heading} ${position.heading}`} data-construction>
        Who do you want to chat with?
      </p>
      {agents.length === 0 ? (
        <p className={`${styles.empty} ${position.empty}`} data-construction>
          No agents yet — create one on the Agents page first.
        </p>
      ) : (
        <div className={position.list} data-construction>
          {agents.map((agent) => (
            <AgentRosterItem key={agent.id} agent={agent} onSelect={() => onSelectAgent(agent.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
