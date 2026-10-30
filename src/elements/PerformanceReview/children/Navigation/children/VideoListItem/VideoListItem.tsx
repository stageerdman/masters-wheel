import { CALL_STATE_META, type VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./VideoListItem.position.module.css";
import styles from "./VideoListItem.styles.module.css";

type VideoListItemProps = {
  video: VideoRecord;
  active: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
};

// Neutral core-palette glyph for a freshly created record that hasn't
// been classified yet (state: null) — never guesses a real state.
const UNSET_META = { glyph: "○", color: "var(--color-text-muted)" };

export function VideoListItem({ video, active, onClick, onContextMenu }: VideoListItemProps) {
  const meta = video.state ? CALL_STATE_META[video.state] : UNSET_META;
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""} ${
        video.reviewed ? styles.reviewed : ""
      }`}
      data-construction
      onClick={onClick}
      onContextMenu={onContextMenu}
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
