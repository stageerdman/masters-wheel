import position from "./AppHeader.position.module.css";
import styles from "./AppHeader.styles.module.css";

export function AppHeader() {
  return (
    <header className={`${styles.root} ${position.root}`}>
      <span className={styles.wordmark}>Master&apos;s Circle</span>
    </header>
  );
}
