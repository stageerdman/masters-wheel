import position from "./Canvas.position.module.css";
import styles from "./Canvas.styles.module.css";

// Root element of the app. Intentionally empty — elements get added here
// one at a time as they're dictated. See CLAUDE.md for the element convention.
export function Canvas() {
  return <div className={`${styles.root} ${position.root}`} />;
}
