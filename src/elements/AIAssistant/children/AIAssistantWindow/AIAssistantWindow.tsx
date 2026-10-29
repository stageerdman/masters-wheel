import type { ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { Composer } from "./children/Composer/Composer";
import { MessageList } from "./children/MessageList/MessageList";
import { useWindowEnterTransition } from "./AIAssistantWindow.script";
import position from "./AIAssistantWindow.position.module.css";
import styles from "./AIAssistantWindow.styles.module.css";

type AIAssistantWindowProps = {
  isClosing: boolean;
  onCollapse: () => void;
  onCollapsed: () => void;
  messages: ChatMessage[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  density: "compact" | "comfortable";
};

export function AIAssistantWindow({
  isClosing,
  onCollapse,
  onCollapsed,
  messages,
  composerValue,
  onComposerChange,
  onSend,
  density,
}: AIAssistantWindowProps) {
  const hasEntered = useWindowEnterTransition();

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (isClosing) onCollapsed();
  }

  const stateClass = isClosing ? styles.closing : hasEntered ? styles.entered : "";

  return (
    <div
      className={`${styles.root} ${position.root} ${stateClass}`}
      data-construction
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={`${styles.header} ${position.header}`} data-construction>
        <button
          type="button"
          className={`${styles.collapseButton} ${position.collapseButton}`}
          data-construction
          onClick={onCollapse}
          aria-label="Collapse AI assistant"
        >
          <span className={`${styles.collapseGlyph} ${position.collapseGlyph}`} data-construction />
        </button>
        {/* Drag-to-dock lands in Phase 3 — inert for now. */}
        <div className={`${styles.dragHandle} ${position.dragHandle}`} data-construction />
      </div>
      <div className={`${styles.content} ${position.content}`} data-construction>
        <MessageList messages={messages} density={density} />
        <Composer value={composerValue} onChange={onComposerChange} onSend={onSend} density={density} />
      </div>
    </div>
  );
}
