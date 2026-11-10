import type { ScorecardItem } from "@/lib/scorecard";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { RatingPill } from "../RatingPill/RatingPill";
import position from "./ScorecardRow.position.module.css";
import styles from "./ScorecardRow.styles.module.css";

type ScorecardRowProps = {
  item: ScorecardItem;
  criteria: ScorecardCriterionDef[];
};

// One criterion + its rating pill. The rating pill's own hover tooltip
// (RatingPill) explains what that rating level means generically.
export function ScorecardRow({ item, criteria }: ScorecardRowProps) {
  const criterion = criteria.find((candidate) => candidate.id === item.criterion);
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction>
        {criterion?.name || "Untitled score"}
      </span>
      <RatingPill rating={item.rating} />
    </div>
  );
}
