import type { ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import position from "./Message.position.module.css";
import styles from "./Message.styles.module.css";

type MessageProps = {
  message: ChatMessage;
  density: "compact" | "comfortable";
};

export function Message({ message, density }: MessageProps) {
  const role = message.role;
  const densityClass = density === "comfortable" ? position.comfortable : "";

  return (
    <div
      className={`${styles.root} ${position.root} ${styles[role]} ${position[role]} ${densityClass}`}
      data-construction
    >
      {message.text}
    </div>
  );
}
