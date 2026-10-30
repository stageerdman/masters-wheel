import Image from "next/image";
import position from "./BackgroundImage.position.module.css";
import styles from "./BackgroundImage.styles.module.css";

// Placeholder backdrop for the Main Menu — a still frame standing in until
// the real, slowed-down HQ video replaces it (see this update's wiki.md).
export function BackgroundImage() {
  return (
    <Image
      src="/main-menu-background.jpg"
      alt=""
      fill
      priority
      className={`${styles.root} ${position.root}`}
      data-construction
    />
  );
}
