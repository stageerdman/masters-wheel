import { StatGrid, type StatSlot } from "@/elements/StatGrid/StatGrid";
import position from "./AnalyticsPanel.position.module.css";
import styles from "./AnalyticsPanel.styles.module.css";

const SLOTS: StatSlot[] = [
  { id: "sessions", statisticId: "sessions-this-month" },
  { id: "win-rate", statisticId: "win-rate" },
  { id: "avg-deal", statisticId: "avg-deal-size" },
  { id: "active-trainees", statisticId: "active-trainees" },
];

export function AnalyticsPanel() {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={styles.heading} data-construction>
        Analytics
      </span>
      <StatGrid slots={SLOTS} />
    </div>
  );
}
