"use client";

import { confirm } from "@tauri-apps/plugin-dialog";
import { LyricsTranscript } from "@/elements/TrainingRoom/children/Hero/children/LyricsTranscript/LyricsTranscript";
import type { DiarizedWord, VoiceTranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./TranscriptPanel.position.module.css";
import styles from "./TranscriptPanel.styles.module.css";

type TranscriptPanelProps = {
  transcriptRaw: string | null;
  wordTimings: DiarizedWord[] | null;
  // Which choice produced transcriptRaw — Regenerate repeats it rather
  // than asking again. `null` falls back to the plain, non-diarized choice.
  diarize: boolean | null;
  generation: VoiceTranscriptGenerationState | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onGenerate: (diarize: boolean) => void;
  // Optional "bring your own transcript" (a file or pasted text, e.g. from
  // Fathom) — shown only where the caller supports it (Learning today).
  onUpload?: () => void;
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
  wordTimings,
  diarize,
  generation,
  currentTime,
  onSeek,
  onGenerate,
  onUpload,
  onStop,
  onRetry,
  onDismiss,
}: TranscriptPanelProps) {
  async function handleRegenerate() {
    const confirmed = await confirm("Regenerate this transcript? This discards the current one.", {
      title: "Regenerate transcript",
      kind: "warning",
    });
    if (confirmed) onGenerate(diarize ?? false);
  }

  if (transcriptRaw) {
    return (
      <div className={position.transcriptWithToolbar} data-construction>
        <div className={position.toolbar} data-construction>
          {onUpload && (
            <button
              type="button"
              className={`${styles.toolbarButton} ${position.toolbarButton}`}
              data-construction
              onClick={onUpload}
              title="Replace with an uploaded transcript"
              aria-label="Replace with an uploaded transcript"
            >
              ⇪
            </button>
          )}
          <button
            type="button"
            className={`${styles.toolbarButton} ${position.toolbarButton}`}
            data-construction
            onClick={() => void handleRegenerate()}
            title="Regenerate transcript"
            aria-label="Regenerate transcript"
          >
            ⟳
          </button>
        </div>
        <LyricsTranscript rawText={transcriptRaw} currentTime={currentTime} onSeek={onSeek} wordTimings={wordTimings} />
      </div>
    );
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
      {onUpload && (
        <button
          type="button"
          className={`${styles.secondaryButton} ${position.secondaryButton}`}
          data-construction
          onClick={onUpload}
          title="Attach a transcript you already have — a file, or text pasted from Fathom"
        >
          Upload transcript
        </button>
      )}
    </div>
  );
}
