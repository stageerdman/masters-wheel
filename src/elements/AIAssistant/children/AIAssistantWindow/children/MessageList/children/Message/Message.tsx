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
  const parts = splitMentions(message.text, agents);

  return (
    <div
      className={`${styles.root} ${position.root} ${styles[role]} ${position[role]} ${densityClass}`}
      data-construction
    >
      {parts.map((part, index) =>
        part.mentionedAgent ? (
          <span key={index} className={`${styles.mention} ${position.mention}`} data-construction>
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </div>
  );
}
