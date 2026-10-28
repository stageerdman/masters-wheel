import position from "./Canvas.position.module.css";
import styles from "./Canvas.styles.module.css";

// Root element of the app. Hosts whatever page content gets dictated.
export function Canvas({ children }: { children?: React.ReactNode }) {
  return <div className={`${styles.root} ${position.root}`}>{children}</div>;
}
