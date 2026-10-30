"use client";

// A Space is one page of statistics — right now it holds exactly one Grid,
// but it's the layer a future "swipe to the next page of widgets" feature
// would extend (multiple Spaces, each with their own Grid), without
// StatGrid itself needing to know about paging.
//
// It's also where "infinite downward" lives: a Space always reserves a few
// empty rows below the real widgets, and grows the Grid's row count as the
// user scrolls within 3 rows of the bottom — so there's always more room
// to scroll into, like Control Center's own widget grid never running out
// of placeable spots.

import { useState, type UIEvent } from "react";
import { StatGrid, type StatSlot } from "@/elements/StatGrid/StatGrid";
import position from "./StatSpace.position.module.css";
import styles from "./StatSpace.styles.module.css";

type StatSpaceProps = {
  slots: StatSlot[];
};

const INITIAL_ROWS = 6;
const GROWTH_ROWS = 3;
const GROWTH_THRESHOLD_ROWS = 3;

export function StatSpace({ slots }: StatSpaceProps) {
  const [rowCount, setRowCount] = useState(INITIAL_ROWS);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    // Measured from the live DOM rather than a hardcoded row height, so
    // this never drifts out of sync with StatGrid's own CSS.
    const rowHeight = el.scrollHeight / rowCount;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom < rowHeight * GROWTH_THRESHOLD_ROWS) {
      setRowCount((count) => count + GROWTH_ROWS);
    }
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction onScroll={handleScroll}>
      <StatGrid slots={slots} rowCount={rowCount} />
    </div>
  );
}
