import position from "./StatWidget.position.module.css";
import styles from "./StatWidget.styles.module.css";

type StatWidgetProps = {
  label: string;
  value: string;
};

export function StatWidget({ label, value }: StatWidgetProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={styles.value} data-construction>
        {value}
      </span>
      <span className={styles.label} data-construction>
        {label}
      </span>
    </div>
  );
}
