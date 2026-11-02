import { SCORECARD_RATING_META, type ScorecardRating } from "@/lib/scorecard";
import position from "./RatingPill.position.module.css";
import styles from "./RatingPill.styles.module.css";

type RatingPillProps = {
  rating: ScorecardRating;
};

// Shared by ScorecardRow and ReasoningModal — the one place the
// Skipped/Poor/Good/Great/Outstanding color coding and hover description
// are defined, so both can't drift apart.
export function RatingPill({ rating }: RatingPillProps) {
  const meta = SCORECARD_RATING_META[rating];
  return (
    <span
      className={`${styles.root} ${position.root} ${rating === 0 ? styles.skipped : ""} ${
        rating === 4 ? styles.outstanding : ""
      }`}
      data-construction
      style={{ "--rating-color": meta.color } as React.CSSProperties}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
