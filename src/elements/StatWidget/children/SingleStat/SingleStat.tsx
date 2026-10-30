import position from "./SingleStat.position.module.css";
import styles from "./SingleStat.styles.module.css";

type SingleStatProps = {
  label: string;
  value: string;
};

export function SingleStat({ label, value }: SingleStatProps) {
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
