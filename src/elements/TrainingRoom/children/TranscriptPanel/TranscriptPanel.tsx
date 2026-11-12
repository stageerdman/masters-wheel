"use client";

import { useMemo } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { SpeakerTranscript } from "@/elements/SpeakerTranscript/SpeakerTranscript";
import { activeEntryIndex, parseTranscript, speakersOf } from "@/lib/transcript";
import { TranscriptionProgress } from "@/elements/TranscriptionProgress/TranscriptionProgress";
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
  const parsed = useMemo(() => (transcriptRaw ? parseTranscript(transcriptRaw) : null), [transcriptRaw]);
  const isSingleSpeaker = parsed ? speakersOf(parsed).length <= 1 : false;

  async function handleRegenerate() {
    const confirmed = await confirm("Regenerate this transcript? This discards the current one.", {
      title: "Regenerate transcript",
      kind: "warning",
    });
    if (confirmed) onGenerate(diarize ?? false);
  }

  if (parsed) {
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
        {/* One voice → Spotify-lyrics style; 2+ → the same speaker-labeled
            view Performance Review uses. Applies to every source alike
            (generated, Fathom, ~/dev/transcriber). */}
        {isSingleSpeaker ? (
          <LyricsTranscript entries={parsed.entries} currentTime={currentTime} onSeek={onSeek} wordTimings={wordTimings} />
        ) : (
          <div className={position.speakerScroll} data-construction>
            <SpeakerTranscript
              entries={parsed.entries}
              activeIndex={activeEntryIndex(parsed.entries, currentTime)}
              onSeek={onSeek}
            />
          </div>
        )}
      </div>
    );
  }

  if (generation?.status === "running") {
    return (
      <div className={`${styles.generating} ${position.generating}`} data-construction>
        <TranscriptionProgress stage={generation.stage} percent={generation.percent} startedAt={generation.startedAt} />
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
