import { forwardRef } from "react";
import position from "./MediaPlayer.position.module.css";
import styles from "./MediaPlayer.styles.module.css";

type MediaPlayerProps = {
  title: string;
  src: string;
};

// Plays a record's real hero file (src is a local-media-server URL built
// by PerformanceReview.script.ts's heroStreamUrl). The caller (Hero) only
// renders this once a hero file exists — see its "Upload video" button for
// the no-media case. Forwards its ref to the underlying <video> so a
// transcript line click elsewhere on the page can seek/play it (see
// Transcript's onSeek).
export const MediaPlayer = forwardRef<HTMLVideoElement, MediaPlayerProps>(function MediaPlayer(
  { title, src },
  ref
) {
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
});
