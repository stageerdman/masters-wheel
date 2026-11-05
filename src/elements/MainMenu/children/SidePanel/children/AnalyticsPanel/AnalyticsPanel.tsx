import type { StatSlot } from "@/elements/StatGrid/StatGrid";
import { StatSpace } from "@/elements/StatSpace/StatSpace";
import position from "./AnalyticsPanel.position.module.css";
import styles from "./AnalyticsPanel.styles.module.css";

const SLOTS: StatSlot[] = [
  { id: "meetings", statisticId: "meetings" },
  { id: "offers", statisticId: "offers" },
  { id: "closed", statisticId: "closed" },
  { id: "closed-amount", statisticId: "closed-amount" },
  { id: "real-close-rate", statisticId: "real-close-rate" },
  { id: "close-rate", statisticId: "close-rate" },
  { id: "lost-amount", statisticId: "lost-amount" },
];

export function AnalyticsPanel() {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <StatSpace slots={SLOTS} />
    </div>
  );
}
