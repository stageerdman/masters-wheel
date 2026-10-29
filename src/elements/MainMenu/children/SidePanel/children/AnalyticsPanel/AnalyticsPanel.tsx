import position from "./AnalyticsPanel.position.module.css";
import styles from "./AnalyticsPanel.styles.module.css";

const FAKE_STATS = [
  { label: "Sessions this month", value: "42" },
  { label: "Win rate", value: "61%" },
  { label: "Avg. deal size", value: "$18,400" },
  { label: "Active trainees", value: "9" },
];

export function AnalyticsPanel() {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={styles.heading} data-construction>
        Analytics
      </span>
      <div className={position.grid} data-construction>
        {FAKE_STATS.map((stat) => (
          <div key={stat.label} className={`${styles.stat} ${position.stat}`} data-construction>
            <span className={styles.statValue} data-construction>
              {stat.value}
            </span>
            <span className={styles.statLabel} data-construction>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
