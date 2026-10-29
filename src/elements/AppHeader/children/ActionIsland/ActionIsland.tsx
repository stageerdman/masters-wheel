import { StateMenu } from "./children/StateMenu/StateMenu";
import type { HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import position from "./ActionIsland.position.module.css";
import styles from "./ActionIsland.styles.module.css";

type ActionIslandProps = {
  stateOptions: HeaderIslandOption[];
  activeStateId: string | null;
  onStateChange: (id: string) => void;
  reviewed: boolean;
  onToggleReviewed: () => void;
};

export function ActionIsland({
  stateOptions,
  activeStateId,
  onStateChange,
  reviewed,
  onToggleReviewed,
}: ActionIslandProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.aiButton} ${position.button}`}
        data-construction
        title="Let AI re-analyze"
        aria-label="Let AI re-analyze"
      >
        AI
      </button>
      <StateMenu options={stateOptions} activeId={activeStateId} onChange={onStateChange} />
      <button
        type="button"
        className={`${styles.swordButton} ${position.button}`}
        data-construction
        title="Take it to the training ground"
        aria-label="Take it to the training ground"
      >
        ⚔
      </button>
      <button
        type="button"
        className={`${styles.checkButton} ${position.button} ${reviewed ? styles.checkButtonActive : ""}`}
        data-construction
        onClick={onToggleReviewed}
        aria-pressed={reviewed}
        title={reviewed ? "Marked as personally reviewed" : "Mark as personally reviewed"}
        aria-label={reviewed ? "Marked as personally reviewed" : "Mark as personally reviewed"}
      >
        ✓
      </button>
    </div>
  );
}
