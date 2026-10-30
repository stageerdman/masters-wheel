import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./TranscriptGenerating.position.module.css";
import styles from "./TranscriptGenerating.styles.module.css";

type TranscriptGeneratingProps = {
  state: TranscriptGenerationState;
  onStop: () => void;
  onRetry: () => void;
  onDismiss: () => void;
};

function statusText(state: Extract<TranscriptGenerationState, { status: "running" }>): string {
  const verb = state.stage === "extracting" ? "Extracting" : "Transcribing";
  const who = state.trackCount > 1 ? `track ${state.trackIndex + 1} of ${state.trackCount} — ${state.trackName}` : state.trackName;
  const tail = state.stage === "uploading" ? " via ElevenLabs" : "";
  return `${verb} ${who}${tail}…`;
}

// Replaces the usual upload/generate prompt in the transcript tab while a
// Generate Transcript job is running (or just failed) for this record — the
// job itself runs in the background (see PerformanceReview.script.ts's
// startGenerateTranscript), so this is purely a status view: progress text,
// an indeterminate bar (there's no real sub-progress within one cloud
// upload+inference call, so this doesn't pretend to one), and Stop.
export function TranscriptGenerating({ state, onStop, onRetry, onDismiss }: TranscriptGeneratingProps) {
  if (state.status === "error") {
    return (
      <div className={`${styles.root} ${position.root}`} data-construction>
        <p className={`${styles.errorText} ${position.text}`} data-construction>
          {state.message}
        </p>
        <div className={position.actions} data-construction>
          <button type="button" className={`${styles.button} ${position.button}`} data-construction onClick={onRetry}>
            Try again
          </button>
          <button
            type="button"
            className={`${styles.secondaryButton} ${position.button}`}
            data-construction
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <p className={`${styles.statusText} ${position.text}`} data-construction>
        {statusText(state)}
      </p>
      <div className={`${styles.progressTrack} ${position.progressTrack}`} data-construction>
        <div className={`${styles.progressFill} ${position.progressFill}`} data-construction />
      </div>
      <button
        type="button"
        className={`${styles.secondaryButton} ${position.button}`}
        data-construction
        onClick={onStop}
      >
        Stop
      </button>
    </div>
  );
}
