// A Space is one page of statistics — right now it holds exactly one Grid,
// but it's the layer a future "swipe to the next page of widgets" feature
// would extend (multiple Spaces, each with their own Grid), without
// StatGrid itself needing to know about paging.
//
// It's just the scrollable viewport — StatGrid decides how many rows it
// actually needs (real widgets + a small buffer), so a Space only ever
// scrolls as far as there's real (or soon-to-be-placed) content, never
// into endless empty space.
//
// StatFilterBar sits above the Grid, inside this same scrollable area —
// it's not a sticky header, it scrolls away with everything else.

import { StatFilterBar } from "@/elements/StatFilterBar/StatFilterBar";
import { StatGrid, type StatSlot } from "@/elements/StatGrid/StatGrid";
import position from "./StatSpace.position.module.css";
import styles from "./StatSpace.styles.module.css";

type StatSpaceProps = {
  slots: StatSlot[];
};

export function StatSpace({ slots }: StatSpaceProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <StatFilterBar />
      <StatGrid slots={slots} />
    </div>
  );
}
