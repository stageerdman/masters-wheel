import Image from "next/image";
import position from "./BackgroundImage.position.module.css";
import styles from "./BackgroundImage.styles.module.css";

// Full-bleed themed backdrop for Settings, same mechanism as MainMenu's own
// BackgroundImage (next/image with `fill`, object-fit: cover).
export function BackgroundImage() {
  return (
    <Image
      src="/settings-background.webp"
      alt=""
      fill
      priority
      className={`${styles.root} ${position.root}`}
      data-construction
    />
  );
}
