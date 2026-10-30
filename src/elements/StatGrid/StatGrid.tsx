"use client";

// Naming: a Space (StatSpace) holds a Grid (this element), a Grid is made
// of Slots (StatSlot — a position + size), and each Slot holds one Widget
// (StatWidget — the thing that actually renders a statistic's visuals).

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getStatistic } from "@/lib/statistics";
import { mergeFilters, type StatFilters } from "@/lib/statistics/filters";
import { StatWidget } from "@/elements/StatWidget/StatWidget";
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
  filters: StatFilters;
};

// Each slot's widget pops in individually rather than the whole grid
// arriving as one block — a short per-index stagger, not a JS animation.
const STAGGER_MS = 40;

// Always keep this many empty cells in reserve beyond the real widgets —
// enough room to place a few more without the grid visibly running out.
// Bounded, not scroll-triggered: row count is a pure function of how many
// cells are actually occupied, not of how far the user has scrolled, so it
// can never grow without a real widget being added to justify it.
const FREE_CELL_BUFFER = 8;

function occupiedCells(slots: StatSlot[]): number {
  return slots.reduce((total, slot) => total + (slot.cols ?? 1) * (slot.rows ?? 1), 0);
}

export function StatGrid({ slots, filters }: StatGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});

  // Column count comes from the live, resolved CSS grid (auto-fill means
  // it depends on container width) rather than being guessed in JS.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const tracks = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean);
      setColumns(tracks.length || 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const slot of slots) {
      const statistic = getStatistic(slot.statisticId);
      statistic
        .compute(mergeFilters(filters, statistic.fixedFilters))
        .then((value) => {
          if (cancelled) return;
          setValues((current) => ({ ...current, [slot.id]: value }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [slots, filters]);

  const rowCount = Math.max(1, Math.ceil((occupiedCells(slots) + FREE_CELL_BUFFER) / columns));

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${position.root}`}
      data-construction
      style={{ "--stat-row-count": rowCount } as CSSProperties}
    >
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
            <StatWidget label={statistic.label} value={values[slot.id] ?? "…"} />
          </div>
        );
      })}
    </div>
  );
}
