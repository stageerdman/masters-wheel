import { useState } from "react";
import {
  CALL_STATE_META,
  backupMark,
  humanDate,
  type BackupState,
  type VideoRecord,
} from "@/elements/PerformanceReview/PerformanceReview.data";
import { RowIcon } from "./RowIcon";
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

const REVIEWED_LABEL = "Reviewed: you marked this call as reviewed";

// True only when `value` changed after first paint in a way `arrives`
// accepts — so a mark that arrives live (upload finished, review ticked)
// settles in, and one that was already there on open just sits.
// Adjusted during render (React's pattern for this, as in Hero).
function useArrivedLive<T>(value: T, arrives: (from: T, to: T) => boolean): boolean {
  const [previous, setPrevious] = useState(value);
  const [arrived, setArrived] = useState(false);
  if (value !== previous) {
    setPrevious(value);
    setArrived(arrives(previous, value));
  }
  return arrived;
}

// Storage settles only from `uploading` to a safe state — never from
// `unknown`: the overview loads after first paint, and every row would
// fade in at once.
const becameSafe = (from: BackupState, to: BackupState) =>
  from === "uploading" && (to === "cloud_only" || to === "cloud_and_local");
const turnedOn = (_from: boolean, to: boolean) => to;

// A session row: outcome glyph, title over a human date, then two marks in
// fixed slots on the right — storage, then Reviewed. Each slot keeps its
// width when empty, so the marks line up as columns down the list.
// See docs/session-row-icons/03-ui-spec.md.
export function VideoListItem({ video, active, onClick, onContextMenu }: VideoListItemProps) {
  const meta = video.state ? CALL_STATE_META[video.state] : UNSET_META;
  const mark = backupMark(video.backup);
  const reviewSettles = useArrivedLive(video.reviewed, turnedOn);
  const backupSettles = useArrivedLive(video.backup, becameSafe);

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
        <span className={position.slot} data-construction>
          {mark && (
            <span
              className={`${styles.mark} ${video.backup === "stuck" ? styles.stuck : ""} ${backupSettles ? styles.settle : ""}`}
              data-construction
              data-mark="backup"
              role="img"
              aria-label={mark.label}
              title={mark.label}
            >
              <RowIcon name={mark.icon} />
            </span>
          )}
        </span>
        <span className={position.slot} data-construction>
          {video.reviewed && (
            <span
              className={`${styles.mark} ${styles.reviewed} ${reviewSettles ? styles.settle : ""}`}
              data-construction
              data-mark="reviewed"
              role="img"
              aria-label={REVIEWED_LABEL}
              title={REVIEWED_LABEL}
            >
              <RowIcon name="reviewed" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
