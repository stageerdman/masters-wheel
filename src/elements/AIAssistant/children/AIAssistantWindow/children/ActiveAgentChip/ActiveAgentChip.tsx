import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import position from "./ActiveAgentChip.position.module.css";
import styles from "./ActiveAgentChip.styles.module.css";

type ActiveAgentChipProps = {
  agent: Agent;
  onRemove: () => void;
};

export function ActiveAgentChip({ agent, onRemove }: ActiveAgentChipProps) {
  return (
    <span className={`${styles.root} ${position.root}`} data-construction>
      <AgentAvatar agent={agent} size={16} />
      {agent.name}
      <button
        type="button"
        className={`${styles.remove} ${position.remove}`}
        data-construction
        onClick={onRemove}
        aria-label={`Remove ${agent.name} from the conversation`}
      >
        ×
      </button>
    </span>
  );
}
