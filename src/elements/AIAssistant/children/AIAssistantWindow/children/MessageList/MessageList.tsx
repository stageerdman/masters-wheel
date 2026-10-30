import type { Agent, ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import { agentDescription } from "@/lib/agents";
import { Message } from "./children/Message/Message";
import position from "./MessageList.position.module.css";
import styles from "./MessageList.styles.module.css";

type MessageListProps = {
  messages: ChatMessage[];
  density: "compact" | "comfortable";
  agents: Agent[];
  respondingAgent: Agent | undefined;
};

export function MessageList({ messages, density, agents, respondingAgent }: MessageListProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {messages.length === 0 ? (
        respondingAgent ? (
          <div className={`${styles.profile} ${position.profile}`} data-construction>
            <AgentAvatar agent={respondingAgent} size={56} />
            <p className={`${styles.profileName} ${position.profileName}`} data-construction>
              {respondingAgent.name}
            </p>
            <p className={`${styles.profileDescription} ${position.profileDescription}`} data-construction>
              {agentDescription(respondingAgent)}
            </p>
          </div>
        ) : (
          <p className={`${styles.empty} ${position.empty}`} data-construction>
            Ask anything.
          </p>
        )
      ) : (
        messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            density={density}
            agents={agents}
            respondingAgent={respondingAgent}
          />
        ))
      )}
    </div>
  );
}
