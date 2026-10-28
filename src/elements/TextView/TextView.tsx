import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./TextView.position.module.css";
import styles from "./TextView.styles.module.css";

type TextViewProps = {
  kind: ContentKind;
  video: VideoRecord;
  notes: string;
  lessons: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
};

// Renders whichever text type is active. Transcript lines are clickable but
// seeking is a no-op for now — no real media to scrub. See FEATURES.md.
export function TextView({ kind, video, notes, lessons, onNotesChange, onLessonsChange }: TextViewProps) {
  if (kind === "main") {
    return <p className={`${styles.readOnlyText} ${position.readOnlyText}`}>{video.mainText}</p>;
  }

  if (kind === "transcript") {
    return (
      <ul className={position.transcriptList}>
        {video.transcript.map((line) => (
          <li key={line.time}>
            <button type="button" className={`${styles.transcriptLine} ${position.transcriptLine}`}>
              <span className={styles.transcriptTime}>{line.time}</span>
              <span>{line.text}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (kind === "notes") {
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notes"
      />
    );
  }

  return (
    <textarea
      className={`${styles.editableText} ${position.editableText}`}
      value={lessons}
      onChange={(event) => onLessonsChange(event.target.value)}
      placeholder="Core lessons"
    />
  );
}
