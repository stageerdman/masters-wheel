import position from "./MediaPlayer.position.module.css";
import styles from "./MediaPlayer.styles.module.css";

type MediaPlayerProps = {
  title: string;
  src: string | null;
};

// Plays the record's real hero file (src is a convertFileSrc URL resolved
// by PerformanceReview.script.ts). Falls back to the old static
// placeholder only if the record has no hero file yet — see FEATURES.md.
export function MediaPlayer({ title, src }: MediaPlayerProps) {
  if (src) {
    return (
      <video
        className={`${styles.root} ${position.root} ${styles.video}`}
        data-construction
        src={src}
        controls
        aria-label={title}
      />
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={styles.playButton} data-construction aria-hidden="true">
        ▶
      </div>
      <span className={styles.label} data-construction>
        {title}
      </span>
    </div>
  );
}
