import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./TextView.position.module.css";
import styles from "./TextView.styles.module.css";

type TextViewProps = {
  kind: ContentKind;
  video: VideoRecord;
  notes: string;
  lessons: string;
  aiAnalysis: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
  onAiAnalysisChange: (value: string) => void;
};

// Renders whichever text type is active. Transcript lines are clickable but
// seeking is a no-op for now — no real media to scrub. See FEATURES.md.
export function TextView({
  kind,
  video,
  notes,
  lessons,
  aiAnalysis,
  onNotesChange,
  onLessonsChange,
  onAiAnalysisChange,
}: TextViewProps) {
  if (kind === "ai") {
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={aiAnalysis}
        onChange={(event) => onAiAnalysisChange(event.target.value)}
        placeholder="AI analysis"
      />
    );
  }

  if (kind === "transcript") {
    return (
      <ul className={position.transcriptList} data-construction>
        {video.transcript.map((line) => (
          <li key={line.time}>
            <button
              type="button"
              className={`${styles.transcriptLine} ${position.transcriptLine}`}
              data-construction
            >
              <span className={styles.transcriptTime} data-construction>
                {line.time}
              </span>
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
        data-construction
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notes"
      />
    );
  }

  return (
    <textarea
      className={`${styles.editableText} ${position.editableText}`}
      data-construction
      value={lessons}
      onChange={(event) => onLessonsChange(event.target.value)}
      placeholder="Core lessons"
    />
  );
}
