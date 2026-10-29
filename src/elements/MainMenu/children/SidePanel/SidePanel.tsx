import { AnalyticsPanel } from "./children/AnalyticsPanel/AnalyticsPanel";
import position from "./SidePanel.position.module.css";
import styles from "./SidePanel.styles.module.css";

type SidePanelProps = {
  content: "analytics" | null;
};

export function SidePanel({ content }: SidePanelProps) {
  return (
    <div
      className={`${styles.root} ${position.root} ${content ? styles.filled : ""}`}
      data-construction
    >
      {content === "analytics" && <AnalyticsPanel />}
    </div>
  );
}
