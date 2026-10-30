// The glass-box shell shared by every widget type. Today there's only one
// content type — SingleStat — nested under children/ because this is
// where future widget types (a graph, etc.) will live side by side with
// it; StatWidget stays the one thing StatGrid places into a slot, picking
// which child to render once there's actually more than one kind.

import { SingleStat } from "./children/SingleStat/SingleStat";
import position from "./StatWidget.position.module.css";
import styles from "./StatWidget.styles.module.css";

type StatWidgetProps = {
  label: string;
  value: string;
};

export function StatWidget({ label, value }: StatWidgetProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <SingleStat label={label} value={value} />
    </div>
  );
}
