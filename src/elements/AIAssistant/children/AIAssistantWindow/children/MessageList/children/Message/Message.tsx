import type { Agent, ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { splitMentions } from "./Message.script";
import position from "./Message.position.module.css";
import styles from "./Message.styles.module.css";

type MessageProps = {
  message: ChatMessage;
  density: "compact" | "comfortable";
  agents: Agent[];
};

export function Message({ message, density, agents }: MessageProps) {
  const role = message.role;
  const densityClass = density === "comfortable" ? position.comfortable : "";
  // An assistant reply starts as an empty placeholder the instant it's
  // sent (see AIAssistant.script.ts's sendMessage) and only gains text once
  // the first streamed delta arrives — render that window as "thinking"
  // rather than an empty bubble.
  const isThinking = role === "assistant" && message.text === "";
  const parts = splitMentions(message.text, agents);

  return (
    <div
      className={`${styles.root} ${position.root} ${styles[role]} ${position[role]} ${densityClass}`}
      data-construction
    >
      {isThinking ? (
        <span className={`${styles.thinking} ${position.thinking}`} data-construction aria-label="Thinking">
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
        </span>
      ) : (
        parts.map((part, index) =>
          part.mentionedAgent ? (
            <span key={index} className={`${styles.mention} ${position.mention}`} data-construction>
              {part.text}
            </span>
          ) : (
            part.text
          ),
        )
      )}
    </div>
  );
}
