"use client";

import { LyricsTranscript } from "@/elements/TrainingRoom/children/Hero/children/LyricsTranscript/LyricsTranscript";
import type { VoiceTranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./TranscriptPanel.position.module.css";
import styles from "./TranscriptPanel.styles.module.css";

type TranscriptPanelProps = {
  transcriptRaw: string | null;
  generation: VoiceTranscriptGenerationState | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onGenerate: (diarize: boolean) => void;
  onStop: () => void;
  onRetry: () => void;
  onDismiss: () => void;
};

function statusText(stage: "extracting" | "uploading"): string {
  return stage === "extracting" ? "Extracting audio…" : "Transcribing via ElevenLabs…";
}

// A single media file's whole transcript lifecycle — the "Generate
// transcript"/"With voice recognition" choice, live progress+Stop, an
// error+Retry/Dismiss, or the lyrics-style synced transcript once one
// exists. Originally ClipFeedItem's own inline markup; pulled out here
// once LearningDetail became a second real consumer of the exact same
// three states, so both render it identically instead of maintaining two
// copies.
export function TranscriptPanel({
  transcriptRaw,
  generation,
  currentTime,
  onSeek,
  onGenerate,
  onStop,
  onRetry,
  onDismiss,
}: TranscriptPanelProps) {
  if (transcriptRaw) {
    return <LyricsTranscript rawText={transcriptRaw} currentTime={currentTime} onSeek={onSeek} />;
  }

  if (generation?.status === "running") {
    return (
      <div className={`${styles.generating} ${position.generating}`} data-construction>
        <p className={`${styles.statusText} ${position.statusText}`} data-construction>
          {statusText(generation.stage)}
        </p>
        <div className={`${styles.progressTrack} ${position.progressTrack}`} data-construction>
          <div className={`${styles.progressFill} ${position.progressFill}`} data-construction />
        </div>
        <button type="button" className={`${styles.secondaryButton} ${position.secondaryButton}`} data-construction onClick={onStop}>
          Stop
        </button>
      </div>
    );
  }

  if (generation?.status === "error") {
    return (
      <div className={`${styles.generating} ${position.generating}`} data-construction>
        <p className={`${styles.errorText} ${position.statusText}`} data-construction>
          {generation.message}
        </p>
        <div className={position.generateChoices} data-construction>
          <button type="button" className={`${styles.generateButton} ${position.generateButton}`} data-construction onClick={onRetry}>
            Try again
          </button>
          <button type="button" className={`${styles.secondaryButton} ${position.secondaryButton}`} data-construction onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={position.generateChoices} data-construction>
      <button
        type="button"
        className={`${styles.generateButton} ${position.generateButton}`}
        data-construction
        onClick={() => onGenerate(false)}
      >
        Generate transcript
      </button>
      <button
        type="button"
        className={`${styles.secondaryButton} ${position.secondaryButton}`}
        data-construction
        onClick={() => onGenerate(true)}
        title="Separates the transcript by who's speaking, detected by voice"
      >
        With voice recognition
      </button>
    </div>
  );
}
