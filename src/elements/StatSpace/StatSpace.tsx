// A Space is one page of statistics — right now it holds exactly one Grid,
// but it's the layer a future "swipe to the next page of widgets" feature
// would extend (multiple Spaces, each with their own Grid), without
// StatGrid itself needing to know about paging.

import { StatGrid, type StatSlot } from "@/elements/StatGrid/StatGrid";
import position from "./StatSpace.position.module.css";
import styles from "./StatSpace.styles.module.css";

type StatSpaceProps = {
  slots: StatSlot[];
};

export function StatSpace({ slots }: StatSpaceProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <StatGrid slots={slots} />
    </div>
  );
}
