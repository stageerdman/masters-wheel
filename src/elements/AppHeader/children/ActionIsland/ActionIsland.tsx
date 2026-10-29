import { StateMenu } from "./children/StateMenu/StateMenu";
import type { HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import position from "./ActionIsland.position.module.css";
import styles from "./ActionIsland.styles.module.css";

type ActionIslandProps = {
  stateOptions: HeaderIslandOption[];
  activeStateId: string;
  onStateChange: (id: string) => void;
};

export function ActionIsland({ stateOptions, activeStateId, onStateChange }: ActionIslandProps) {
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
    </div>
  );
}
