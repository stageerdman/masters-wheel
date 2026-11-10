"use client";

import { formatTimestamp } from "@/lib/transcript";
import type { QuestionAnswerPair } from "@/lib/questionAnalysis";
import position from "./QuestionRow.position.module.css";
import styles from "./QuestionRow.styles.module.css";

type QuestionRowProps = {
  pair: QuestionAnswerPair;
  onSeek: (seconds: number) => void;
};

// One extracted question + its clean outcome. Unlike ScorecardRow there's
// nothing to expand/collapse — the question and answer are already the
// clean short form, nothing long to hide behind a click.
export function QuestionRow({ pair, onSeek }: QuestionRowProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.header} data-construction>
        <p className={`${styles.question} ${position.question}`} data-construction>
          {pair.question}
        </p>
        {pair.timestampSeconds !== null && (
          <button
            type="button"
            className={`${styles.timestamp} ${position.timestamp}`}
            data-construction
            onClick={() => onSeek(pair.timestampSeconds as number)}
          >
            {formatTimestamp(pair.timestampSeconds)}
          </button>
        )}
      </div>
      <p className={`${styles.answer} ${position.answer}`} data-construction>
        {pair.answer}
      </p>
    </div>
  );
}
