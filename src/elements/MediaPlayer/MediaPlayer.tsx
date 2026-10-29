import position from "./MediaPlayer.position.module.css";
import styles from "./MediaPlayer.styles.module.css";

type MediaPlayerProps = {
  title: string;
};

// Fake placeholder — no real playback yet. See FEATURES.md.
export function MediaPlayer({ title }: MediaPlayerProps) {
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
