"use client";

import type { TrackSelection } from "@/lib/transcript/generate";
import { useGenerateTranscript } from "./GenerateTranscriptModal.script";
import position from "./GenerateTranscriptModal.position.module.css";
import styles from "./GenerateTranscriptModal.styles.module.css";

type GenerateTranscriptModalProps = {
  isOpen: boolean;
  sourcePath: string | null;
  onStart: (sourcePath: string, selections: TrackSelection[]) => void;
  onClose: () => void;
};

// Detect the record's audio tracks, let the user keep/name whichever are
// real speakers (only shown when there's more than one track to resolve),
// then hand the picked tracks to the caller and close — the actual cloud
// transcription runs as a background job the caller owns (see
// PerformanceReview.script.ts's startGenerateTranscript), shown inline in
// the transcript tab rather than in this modal, so a long call never
// blocks the UI. See GenerateTranscriptModal.script.ts for the detect/pick
// state machine and src/lib/transcript/generate.ts for the pipeline this
// follows from ~/dev/transcriber.
export function GenerateTranscriptModal({ isOpen, sourcePath, onStart, onClose }: GenerateTranscriptModalProps) {
  const { status, rows, error, updateName, toggleKeep, confirm, retry } = useGenerateTranscript(
    isOpen,
    sourcePath,
    (path, selections) => {
      onStart(path, selections);
      onClose();
    }
  );

  if (!isOpen) return null;

  const keptCount = rows.filter((row) => row.keep).length;

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={(event) => event.stopPropagation()}
      >
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Generate a transcript
          </h2>
          <button
            type="button"
            className={`${styles.closeButton} ${position.closeButton}`}
            data-construction
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {status === "detecting" && (
          <p className={`${styles.statusText} ${position.statusText}`} data-construction>
            Detecting voices…
          </p>
        )}

        {status === "selecting" && (
          <>
            <p className={`${styles.helpText} ${position.helpText}`} data-construction>
              Who&apos;s on this call? Keep the tracks that are real speakers and name them.
            </p>
            <ul className={position.trackList} data-construction>
              {rows.map((row) => (
                <li key={row.index} className={`${styles.trackRow} ${position.trackRow}`} data-construction>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={row.keep}
                    onChange={() => toggleKeep(row.index)}
                    aria-label={`Keep track ${row.index}`}
                  />
                  <input
                    type="text"
                    className={`${styles.nameInput} ${position.nameInput}`}
                    data-construction
                    value={row.name}
                    disabled={!row.keep}
                    onChange={(event) => updateName(row.index, event.target.value)}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${styles.primaryButton} ${position.primaryButton}`}
              data-construction
              disabled={keptCount === 0}
              onClick={confirm}
            >
              Generate transcript
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p className={`${styles.error} ${position.error}`} data-construction>
              {error}
            </p>
            {sourcePath && (
              <button
                type="button"
                className={`${styles.primaryButton} ${position.primaryButton}`}
                data-construction
                onClick={retry}
              >
                Try again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
