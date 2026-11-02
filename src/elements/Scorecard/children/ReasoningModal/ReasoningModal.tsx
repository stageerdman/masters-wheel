"use client";

import { formatTimestamp } from "@/lib/transcript";
import { SCORECARD_CRITERIA_META, type Scorecard as ScorecardData } from "@/lib/scorecard";
import { RatingPill } from "../RatingPill/RatingPill";
import position from "./ReasoningModal.position.module.css";
import styles from "./ReasoningModal.styles.module.css";

type ReasoningModalProps = {
  scorecard: ScorecardData;
  onSeek: (seconds: number) => void;
  onClose: () => void;
};

// The Scorecard's document button opens this: the AI's full reasoning for
// every item, each with a clickable mm:ss timestamp that seeks the real
// video — reuses the same seek plumbing the Transcript tab already has.
// A Skipped item has no moment in the call to point at, so its timestamp
// chip is omitted rather than shown disabled.
export function ReasoningModal({ scorecard, onSeek, onClose }: ReasoningModalProps) {
  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={(event) => event.stopPropagation()}
      >
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Scorecard reasoning
          </h2>
          <button
            type="button"
            className={`${styles.closeButton} ${position.closeButton}`}
            data-construction
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ul className={position.list} data-construction>
          {scorecard.items.map((item) => {
            const criterion = SCORECARD_CRITERIA_META[item.criterion];
            return (
              <li key={item.criterion} className={position.item} data-construction>
                <div className={position.itemHeader} data-construction>
                  <span className={`${styles.itemLabel} ${position.itemLabel}`} data-construction>
                    {criterion.label}
                  </span>
                  <RatingPill rating={item.rating} />
                  {item.timestampSeconds !== null && (
                    <button
                      type="button"
                      className={`${styles.timestamp} ${position.timestamp}`}
                      data-construction
                      onClick={() => onSeek(item.timestampSeconds as number)}
                    >
                      {formatTimestamp(item.timestampSeconds)}
                    </button>
                  )}
                </div>
                <p className={`${styles.reasoning} ${position.reasoning}`} data-construction>
                  {item.reasoning}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
