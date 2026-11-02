import { SCORECARD_CRITERIA_META, type ScorecardItem } from "@/lib/scorecard";
import { RatingPill } from "../RatingPill/RatingPill";
import position from "./ScorecardRow.position.module.css";
import styles from "./ScorecardRow.styles.module.css";

type ScorecardRowProps = {
  item: ScorecardItem;
};

// One criterion + its rating pill. The criterion's hover tooltip explains
// what it means; the rating pill's own hover tooltip (RatingPill) explains
// what that rating level means — two independent, discoverable
// explanations rather than one that tries to do both jobs.
export function ScorecardRow({ item }: ScorecardRowProps) {
  const criterion = SCORECARD_CRITERIA_META[item.criterion];
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction title={criterion.description}>
        {criterion.label}
      </span>
      <RatingPill rating={item.rating} />
    </div>
  );
}
