import type { CSSProperties } from "react";
import { getStatistic } from "@/lib/statistics";
import { StatTile } from "@/elements/StatTile/StatTile";
import position from "./StatGrid.position.module.css";
import styles from "./StatGrid.styles.module.css";

export type StatSlot = {
  id: string;
  statisticId: string;
  // How many grid cells this slot spans. Defaults to the minimal 1x1
  // footprint — pass larger values once a widget actually needs the room.
  cols?: number;
  rows?: number;
};

type StatGridProps = {
  slots: StatSlot[];
};

export function StatGrid({ slots }: StatGridProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {slots.map((slot) => {
        const statistic = getStatistic(slot.statisticId);
        return (
          <div
            key={slot.id}
            className={position.slot}
            data-construction
            style={
              {
                "--stat-cols": slot.cols ?? 1,
                "--stat-rows": slot.rows ?? 1,
              } as CSSProperties
            }
          >
            <StatTile label={statistic.label} value={statistic.compute()} />
          </div>
        );
      })}
    </div>
  );
}
