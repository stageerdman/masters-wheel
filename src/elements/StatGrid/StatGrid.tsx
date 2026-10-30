"use client";

import { useEffect, useState, type CSSProperties } from "react";
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

// Each slot pops in individually rather than the whole grid arriving as
// one block — a short per-index stagger, not a JS animation.
const STAGGER_MS = 40;

export function StatGrid({ slots }: StatGridProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    for (const slot of slots) {
      getStatistic(slot.statisticId)
        .compute()
        .then((value) => {
          if (cancelled) return;
          setValues((current) => ({ ...current, [slot.id]: value }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [slots]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {slots.map((slot, index) => {
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
                "--stat-delay": `${index * STAGGER_MS}ms`,
              } as CSSProperties
            }
          >
            <StatTile label={statistic.label} value={values[slot.id] ?? "…"} />
          </div>
        );
      })}
    </div>
  );
}
