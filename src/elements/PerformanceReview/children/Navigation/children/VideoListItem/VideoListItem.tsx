import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./VideoListItem.position.module.css";
import styles from "./VideoListItem.styles.module.css";

const ICONS: Record<VideoRecord["activityType"], { glyph: string; color: string }> = {
  success: { glyph: "$", color: "var(--color-success)" },
  followup: { glyph: "→", color: "var(--color-pending)" },
  training: { glyph: "●", color: "var(--color-info)" },
};

type VideoListItemProps = {
  video: VideoRecord;
  active: boolean;
  onClick: () => void;
};

export function VideoListItem({ video, active, onClick }: VideoListItemProps) {
  const icon = ICONS[video.activityType];
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span
        className={`${styles.icon} ${position.icon}`}
        style={{ "--icon-color": icon.color } as React.CSSProperties}
        aria-hidden="true"
      >
        {icon.glyph}
      </span>
      <span className={position.textRows}>
        <span className={styles.date}>{video.date}</span>
        <span className={styles.title}>{video.title}</span>
      </span>
    </button>
  );
}
