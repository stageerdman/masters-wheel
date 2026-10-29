import { forwardRef } from "react";
import position from "./MediaPlayer.position.module.css";
import styles from "./MediaPlayer.styles.module.css";

type MediaPlayerProps = {
  title: string;
  src: string | null;
};

// Plays the record's real hero file (src is a local-media-server URL built
// by PerformanceReview.script.ts's heroStreamUrl). Falls back to the old static
// placeholder only if the record has no hero file yet — see FEATURES.md.
// Forwards its ref to the underlying <video> so a transcript line click
// elsewhere on the page can seek/play it (see Transcript's onSeek).
export const MediaPlayer = forwardRef<HTMLVideoElement, MediaPlayerProps>(function MediaPlayer(
  { title, src },
  ref
) {
  if (src) {
    return (
      <video
        ref={ref}
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
});
