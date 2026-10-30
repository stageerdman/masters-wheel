import position from "./TranscriptEmptyState.position.module.css";
import styles from "./TranscriptEmptyState.styles.module.css";

type TranscriptEmptyStateProps = {
  onUpload: () => void;
  onGenerate: () => void;
};

export function TranscriptEmptyState({ onUpload, onGenerate }: TranscriptEmptyStateProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <p className={`${styles.text} ${position.text}`} data-construction>
        No transcript yet.
      </p>
      <div className={position.actions} data-construction>
        <button
          type="button"
          className={`${styles.button} ${position.button}`}
          data-construction
          onClick={onUpload}
        >
          Upload a transcript
        </button>
        <button
          type="button"
          className={`${styles.button} ${position.button}`}
          data-construction
          onClick={onGenerate}
        >
          Generate a transcript
        </button>
      </div>
    </div>
  );
}
