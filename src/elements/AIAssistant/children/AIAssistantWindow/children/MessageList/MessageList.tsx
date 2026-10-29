import type { Agent, ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { Message } from "./children/Message/Message";
import position from "./MessageList.position.module.css";
import styles from "./MessageList.styles.module.css";

type MessageListProps = {
  messages: ChatMessage[];
  density: "compact" | "comfortable";
  agents: Agent[];
};

export function MessageList({ messages, density, agents }: MessageListProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {messages.length === 0 ? (
        <p className={`${styles.empty} ${position.empty}`} data-construction>
          Ask anything.
        </p>
      ) : (
        messages.map((message) => (
          <Message key={message.id} message={message} density={density} agents={agents} />
        ))
      )}
    </div>
  );
}
