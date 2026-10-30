import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import position from "./HistoryListItem.position.module.css";
import styles from "./HistoryListItem.styles.module.css";

type HistoryListItemProps = {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  agents: Agent[];
};

// A session's "primary" agent for the history thumbnail — the dedicated
// chat-with-X marker if there is one, else the first agent dragged/
// mentioned in, else none (a plain multi-agent-free chat has no photo to
// show).
function resolvePrimaryAgent(session: ChatSession, agents: Agent[]): Agent | undefined {
  const id = session.agentId ?? session.activeAgentIds[0];
  return id ? agents.find((agent) => agent.id === id) : undefined;
}

export function HistoryListItem({ session, active, onSelect, agents }: HistoryListItemProps) {
  const primaryAgent = resolvePrimaryAgent(session, agents);

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      onClick={onSelect}
      aria-pressed={active}
    >
      {primaryAgent && <AgentAvatar agent={primaryAgent} size={24} />}
      <span className={position.text} data-construction>
        <span className={styles.title} data-construction>
          {session.title}
        </span>
        <span className={styles.date} data-construction>
          {session.relativeDate}
        </span>
      </span>
    </button>
  );
}
