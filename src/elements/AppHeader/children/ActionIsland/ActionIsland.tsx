"use client";

import { confirm } from "@tauri-apps/plugin-dialog";
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
  hasScorecard: boolean;
  isGeneratingScorecard: boolean;
  onGenerateScorecard: () => void;
};

export function ActionIsland({
  stateOptions,
  activeStateId,
  onStateChange,
  reviewed,
  onToggleReviewed,
  hasScorecard,
  isGeneratingScorecard,
  onGenerateScorecard,
}: ActionIslandProps) {
  async function handleGenerateScorecard() {
    if (isGeneratingScorecard) return;
    if (hasScorecard) {
      const confirmed = await confirm("Regenerate the scorecard? This replaces the current analysis.", {
        title: "Regenerate scorecard",
        kind: "warning",
      });
      if (!confirmed) return;
    }
    onGenerateScorecard();
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.aiButton} ${position.button}`}
        data-construction
        disabled={isGeneratingScorecard}
        onClick={handleGenerateScorecard}
        title={isGeneratingScorecard ? "Generating scorecard…" : hasScorecard ? "Regenerate scorecard" : "Generate scorecard"}
        aria-label={isGeneratingScorecard ? "Generating scorecard…" : hasScorecard ? "Regenerate scorecard" : "Generate scorecard"}
      >
        SC
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
