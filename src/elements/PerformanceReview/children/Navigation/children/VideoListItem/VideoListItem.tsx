import { CALL_STATE_META, type VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./VideoListItem.position.module.css";
import styles from "./VideoListItem.styles.module.css";

type VideoListItemProps = {
  video: VideoRecord;
  active: boolean;
  onClick: () => void;
};

export function VideoListItem({ video, active, onClick }: VideoListItemProps) {
  const meta = CALL_STATE_META[video.state];
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      onClick={onClick}
      aria-pressed={active}
      title={video.description || undefined}
    >
      <span
        className={`${styles.icon} ${position.icon}`}
        data-construction
        style={{ "--icon-color": meta.color } as React.CSSProperties}
        aria-hidden="true"
      >
        {meta.glyph}
      </span>
      <span className={position.textRows} data-construction>
        <span className={styles.date} data-construction>
          {video.date}
        </span>
        <span className={styles.title} data-construction>
          {video.title}
        </span>
      </span>
    </button>
  );
}
