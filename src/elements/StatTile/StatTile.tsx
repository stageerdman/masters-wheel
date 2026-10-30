import position from "./StatTile.position.module.css";
import styles from "./StatTile.styles.module.css";

type StatTileProps = {
  label: string;
  value: string;
};

export function StatTile({ label, value }: StatTileProps) {
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
