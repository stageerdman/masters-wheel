"use client";

import { useState } from "react";
import type { Scorecard as ScorecardData } from "@/lib/scorecard";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { ScorecardRow } from "./children/ScorecardRow/ScorecardRow";
import { ReasoningModal } from "./children/ReasoningModal/ReasoningModal";
import position from "./Scorecard.position.module.css";
import styles from "./Scorecard.styles.module.css";

type ScorecardProps = {
  scorecard: ScorecardData | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSeek: (seconds: number) => void;
  criteria: ScorecardCriterionDef[];
};

// Renders whichever of 3 states applies: nothing generated yet (just a
// Generate button), a generation in flight (fake delay this round — see
// this update's wiki.md), or a real result (one row per criterion plus the
// improvement suggestion). The document button next to the title opens
// ReasoningModal — the only place the AI's per-item reasoning and
// timestamps show up.
export function Scorecard({ scorecard, isGenerating, onGenerate, onSeek, criteria }: ScorecardProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  if (!scorecard) {
    return (
      <div className={`${styles.root} ${position.root} ${position.empty}`} data-construction>
        {isGenerating ? (
          <p className={`${styles.statusText} ${position.statusText}`} data-construction>
            Generating scorecard…
          </p>
        ) : (
          <button
            type="button"
            className={`${styles.generateButton} ${position.generateButton}`}
            data-construction
            onClick={onGenerate}
          >
            Generate Scorecard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.header} data-construction>
        <h2 className={`${styles.title} ${position.title}`} data-construction>
          Scorecard
        </h2>
        <button
          type="button"
          className={`${styles.reasoningButton} ${position.reasoningButton}`}
          data-construction
          onClick={() => setIsReasoningOpen(true)}
          title="View AI's reasoning"
          aria-label="View AI's reasoning"
        >
          ▤
        </button>
      </div>
      <ul className={position.list} data-construction>
        {scorecard.items.map((item) => (
          <li key={item.criterion}>
            <ScorecardRow item={item} criteria={criteria} />
          </li>
        ))}
      </ul>
      <div className={position.suggestion} data-construction>
        <p className={`${styles.suggestionLabel} ${position.suggestionLabel}`} data-construction>
          Focus next
        </p>
        <p className={`${styles.suggestionText} ${position.suggestionText}`} data-construction>
          {scorecard.improvementSuggestion}
        </p>
      </div>
      {isReasoningOpen && (
        <ReasoningModal
          scorecard={scorecard}
          criteria={criteria}
          onSeek={onSeek}
          onClose={() => setIsReasoningOpen(false)}
        />
      )}
    </div>
  );
}
