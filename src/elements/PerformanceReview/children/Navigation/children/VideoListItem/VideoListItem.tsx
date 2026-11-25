import { useState } from "react";
import {
  CALL_STATE_META,
  backupMark,
  humanDate,
  type VideoRecord,
} from "@/elements/PerformanceReview/PerformanceReview.data";
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

// True only when `value` turned on after first paint — so a mark that
// arrives live (upload finished, review ticked) settles in, and one that
// was already there on open just sits.
// Adjusted during render (React's pattern for this, as in Hero).
function useArrivedLive(value: boolean): boolean {
  const [previous, setPrevious] = useState(value);
  const [arrived, setArrived] = useState(false);
  if (value !== previous) {
    setPrevious(value);
    setArrived(value);
  }
  return arrived;
}

// A session row: outcome glyph, title over a human date, then two quiet
// marks on the right — reviewed, and backed up to OneDrive. Loudness runs
// title › glyph › reviewed › backed up. See
// docs/performance-review-redesign/03-ui-spec.md.
export function VideoListItem({ video, active, onClick, onContextMenu }: VideoListItemProps) {
  const meta = video.state ? CALL_STATE_META[video.state] : UNSET_META;
  const mark = backupMark(video.backup);
  const backedUp = Boolean(mark?.visible);
  const reviewSettles = useArrivedLive(video.reviewed);
  const backupSettles = useArrivedLive(backedUp);

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
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
        <span className={styles.title} data-construction>
          {video.title}
        </span>
        <span className={styles.date} data-construction>
          {humanDate(video.date)}
        </span>
      </span>
      <span className={position.marks} data-construction>
        {video.reviewed && (
          <span
            className={`${styles.reviewedMark} ${reviewSettles ? styles.settle : ""}`}
            data-construction
            data-mark="reviewed"
            role="img"
            aria-label="Reviewed"
            title="Reviewed"
          >
            •
          </span>
        )}
        {mark?.visible && (
          <span
            className={`${styles.backupMark} ${backupSettles ? styles.settle : ""}`}
            data-construction
            data-mark="backup"
            role="img"
            aria-label={mark.label}
            title={mark.label}
          >
            ✓
          </span>
        )}
        {mark && !mark.visible && (
          <span className={`${styles.srOnly} ${position.srOnly}`} data-construction>
            {mark.label}
          </span>
        )}
      </span>
    </button>
  );
}
