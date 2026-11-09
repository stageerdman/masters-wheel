"use client";

import { useRef, useState } from "react";
import { LyricsTranscript } from "../LyricsTranscript/LyricsTranscript";
import type { TrainingClip } from "@/elements/TrainingRoom/TrainingRoom.data";
import type { VoiceTranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./ClipFeedItem.position.module.css";
import styles from "./ClipFeedItem.styles.module.css";

type ClipFeedItemProps = {
  clip: TrainingClip;
  generation: VoiceTranscriptGenerationState | null;
  onGenerateTranscript: (diarize: boolean) => void;
  onStopGenerateTranscript: () => void;
  onRetryGenerateTranscript: () => void;
  onDismissGenerateTranscriptError: () => void;
};

function statusText(stage: "extracting" | "uploading"): string {
  return stage === "extracting" ? "Extracting audio…" : "Transcribing via ElevenLabs…";
}

// One feed entry: a real media element (video or audio — Voice Training
// accepts either) plus whatever's below it, depending on this clip's
// transcript state: the "Generate transcript" choice (no transcript yet),
// live progress/an error (a generation job is running or just failed — see
// TrainingRoom.script.ts's generationByClip), or the lyrics-style synced
// transcript once one exists. Tracks its own playhead via the element's
// real `timeupdate` so LyricsTranscript's word highlight follows real
// playback, not a simulated clock.
export function ClipFeedItem({
  clip,
  generation,
  onGenerateTranscript,
  onStopGenerateTranscript,
  onRetryGenerateTranscript,
  onDismissGenerateTranscriptError,
}: ClipFeedItemProps) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  function seekTo(seconds: number) {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = seconds;
    el.play();
  }

  return (
    <article className={`${styles.root} ${position.root}`} data-construction>
      {clip.kind === "video" ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className={`${styles.media} ${position.media}`}
          data-construction
          src={clip.src}
          controls
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          aria-label={clip.fileName}
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          className={`${styles.media} ${position.media}`}
          data-construction
          src={clip.src}
          controls
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          aria-label={clip.fileName}
        />
      )}
      <p className={`${styles.fileName} ${position.fileName}`} data-construction>
        {clip.fileName}
      </p>
      <div className={position.transcriptSlot} data-construction>
        {clip.transcriptRaw ? (
          <LyricsTranscript rawText={clip.transcriptRaw} currentTime={currentTime} onSeek={seekTo} />
        ) : generation?.status === "running" ? (
          <div className={`${styles.generating} ${position.generating}`} data-construction>
            <p className={`${styles.statusText} ${position.statusText}`} data-construction>
              {statusText(generation.stage)}
            </p>
            <div className={`${styles.progressTrack} ${position.progressTrack}`} data-construction>
              <div className={`${styles.progressFill} ${position.progressFill}`} data-construction />
            </div>
            <button
              type="button"
              className={`${styles.secondaryButton} ${position.secondaryButton}`}
              data-construction
              onClick={onStopGenerateTranscript}
            >
              Stop
            </button>
          </div>
        ) : generation?.status === "error" ? (
          <div className={`${styles.generating} ${position.generating}`} data-construction>
            <p className={`${styles.errorText} ${position.statusText}`} data-construction>
              {generation.message}
            </p>
            <div className={position.generateChoices} data-construction>
              <button
                type="button"
                className={`${styles.generateButton} ${position.generateButton}`}
                data-construction
                onClick={onRetryGenerateTranscript}
              >
                Try again
              </button>
              <button
                type="button"
                className={`${styles.secondaryButton} ${position.secondaryButton}`}
                data-construction
                onClick={onDismissGenerateTranscriptError}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className={position.generateChoices} data-construction>
            <button
              type="button"
              className={`${styles.generateButton} ${position.generateButton}`}
              data-construction
              onClick={() => onGenerateTranscript(false)}
            >
              Generate transcript
            </button>
            <button
              type="button"
              className={`${styles.secondaryButton} ${position.secondaryButton}`}
              data-construction
              onClick={() => onGenerateTranscript(true)}
              title="Separates the transcript by who's speaking, detected by voice"
            >
              With voice recognition
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
