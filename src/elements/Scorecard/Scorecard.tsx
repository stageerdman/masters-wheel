"use client";

import { useState } from "react";
import type { Scorecard as ScorecardData } from "@/lib/scorecard";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { ScorecardRow } from "./children/ScorecardRow/ScorecardRow";
import position from "./Scorecard.position.module.css";
import styles from "./Scorecard.styles.module.css";

type ScorecardProps = {
  scorecard: ScorecardData | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSeek: (seconds: number) => void;
  criteria: ScorecardCriterionDef[];
  error: string | null;
};

// Renders whichever state applies: nothing generated yet (just a Generate
// button, or an error + "Try again" if the last attempt failed), a real
// `claude` CLI call in flight (can take up to a minute or two — see
// src/lib/scorecard/generate.ts), or a real result (one row per
// criterion, a whole-call summary, then the improvement suggestion).
// Each row expands inline (click to open, one open at a time — see
// ScorecardRow) to show its timestamp(s) and reasoning. Regenerating an
// existing scorecard (the header's "SC" button) shows the same
// generating/error state as a thin banner above the rows rather than
// hiding them.
export function Scorecard({ scorecard, isGenerating, onGenerate, onSeek, criteria, error }: ScorecardProps) {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  if (!scorecard) {
    return (
      <div className={`${styles.root} ${position.root} ${position.empty}`} data-construction>
        {isGenerating ? (
          <>
            <p className={`${styles.statusText} ${position.statusText}`} data-construction>
              Generating scorecard…
            </p>
            <p className={`${styles.statusSubtext} ${position.statusSubtext}`} data-construction>
              This can take a minute.
            </p>
          </>
        ) : error ? (
          <>
            <p className={`${styles.errorText} ${position.errorText}`} data-construction>
              {error}
            </p>
            <button
              type="button"
              className={`${styles.generateButton} ${position.generateButton}`}
              data-construction
              onClick={onGenerate}
            >
              Try again
            </button>
          </>
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
      </div>
      {isGenerating && (
        <p className={`${styles.statusText} ${position.statusText}`} data-construction>
          Regenerating…
        </p>
      )}
      {!isGenerating && error && (
        <p className={`${styles.errorText} ${position.errorText}`} data-construction>
          {error}
        </p>
      )}
      <ul className={position.list} data-construction>
        {scorecard.items.map((item) => (
          <li key={item.criterion}>
            <ScorecardRow
              item={item}
              criteria={criteria}
              isExpanded={expandedCriterion === item.criterion}
              onToggle={() =>
                setExpandedCriterion((current) => (current === item.criterion ? null : item.criterion))
              }
              onSeek={onSeek}
            />
          </li>
        ))}
      </ul>
      {scorecard.summary && (
        <div className={position.summary} data-construction>
          <p className={`${styles.summaryLabel} ${position.summaryLabel}`} data-construction>
            Summary
          </p>
          <p className={`${styles.summaryText} ${position.summaryText}`} data-construction>
            {scorecard.summary}
          </p>
        </div>
      )}
      <div className={position.suggestion} data-construction>
        <p className={`${styles.suggestionLabel} ${position.suggestionLabel}`} data-construction>
          Focus next
        </p>
        <p className={`${styles.suggestionText} ${position.suggestionText}`} data-construction>
          {scorecard.improvementSuggestion}
        </p>
      </div>
    </div>
  );
}
