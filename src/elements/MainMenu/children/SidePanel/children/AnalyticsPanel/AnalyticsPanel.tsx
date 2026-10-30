import type { StatSlot } from "@/elements/StatGrid/StatGrid";
import { StatSpace } from "@/elements/StatSpace/StatSpace";
import position from "./AnalyticsPanel.position.module.css";
import styles from "./AnalyticsPanel.styles.module.css";

const SLOTS: StatSlot[] = [{ id: "sessions", statisticId: "sessions-this-month" }];

export function AnalyticsPanel() {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <StatSpace slots={SLOTS} />
    </div>
  );
}
