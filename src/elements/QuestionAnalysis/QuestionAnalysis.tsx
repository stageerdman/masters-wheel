"use client";

import type { QuestionAnalysis as QuestionAnalysisData } from "@/lib/questionAnalysis";
import { QuestionRow } from "./children/QuestionRow/QuestionRow";
import position from "./QuestionAnalysis.position.module.css";
import styles from "./QuestionAnalysis.styles.module.css";

type QuestionAnalysisProps = {
  data: QuestionAnalysisData | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSeek: (seconds: number) => void;
  error: string | null;
};

// Renders whichever state applies: nothing generated yet (just a Generate
// button, or an error + "Try again" if the last attempt failed), a real
// `claude` CLI call in flight (cheap/fast model, see src/lib/questionAnalysis/
// generate.ts), or a real result (one row per extracted question).
// Clicking "Generate" with no transcript yet shows the same native toast
// Scorecard's generate button does (see PerformanceReview.script.ts) rather
// than disabling the button — same convention both generate-style cards use.
export function QuestionAnalysis({ data, isGenerating, onGenerate, onSeek, error }: QuestionAnalysisProps) {
  if (!data) {
    return (
      <div className={`${styles.root} ${position.root} ${position.empty}`} data-construction>
        {isGenerating ? (
          <>
            <p className={`${styles.statusText} ${position.statusText}`} data-construction>
              Extracting questions…
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
            Generate Question Analysis
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.header} data-construction>
        <h2 className={`${styles.title} ${position.title}`} data-construction>
          Question Analysis
        </h2>
        <span className={`${styles.count} ${position.count}`} data-construction>
          {data.pairs.length} {data.pairs.length === 1 ? "question" : "questions"}
        </span>
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
        {data.pairs.map((pair, index) => (
          <li key={index}>
            <QuestionRow pair={pair} onSeek={onSeek} />
          </li>
        ))}
      </ul>
    </div>
  );
}
