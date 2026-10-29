import position from "./AIAssistantTrigger.position.module.css";
import styles from "./AIAssistantTrigger.styles.module.css";

type AIAssistantTriggerProps = {
  onOpen: () => void;
};

// Idle state of the AI assistant: several unfinished concentric circles,
// each rotating slowly in a different direction.
export function AIAssistantTrigger({ onOpen }: AIAssistantTriggerProps) {
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root}`}
      data-construction
      onClick={onOpen}
      aria-label="Open AI assistant"
    >
      <svg
        className={styles.rings}
        data-construction
        viewBox="0 0 32 32"
        width="32"
        height="32"
        aria-hidden="true"
      >
        <circle className={styles.ringOuter} cx="16" cy="16" r="14" />
        <circle className={styles.ringMiddle} cx="16" cy="16" r="9.5" />
        <circle className={styles.ringInner} cx="16" cy="16" r="5" />
      </svg>
    </button>
  );
}
