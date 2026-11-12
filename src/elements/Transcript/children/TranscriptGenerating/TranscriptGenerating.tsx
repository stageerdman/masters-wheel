import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import { TranscriptionProgress } from "@/elements/TranscriptionProgress/TranscriptionProgress";
import position from "./TranscriptGenerating.position.module.css";
import styles from "./TranscriptGenerating.styles.module.css";

type TranscriptGeneratingProps = {
  state: TranscriptGenerationState;
  onStop: () => void;
  onRetry: () => void;
  onDismiss: () => void;
};

function subjectFor(state: Extract<TranscriptGenerationState, { status: "running" }>): string {
  return state.trackCount > 1 ? `Track ${state.trackIndex + 1} of ${state.trackCount} (${state.trackName})` : state.trackName;
}

// Replaces the usual upload/generate prompt in the transcript tab while a
// Generate Transcript job is running (or just failed) for this record — the
// job itself runs in the background (see PerformanceReview.script.ts's
// startGenerateTranscript), so this is purely a status view: the shared
// TranscriptionProgress (stage, upload %, elapsed time) and Stop.
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
      <TranscriptionProgress
        stage={state.stage}
        percent={state.percent}
        startedAt={state.startedAt}
        subject={subjectFor(state)}
      />
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
