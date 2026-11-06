"use client";

import { useRef, useState } from "react";
import { LyricsTranscript } from "../LyricsTranscript/LyricsTranscript";
import type { TrainingClip } from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./ClipFeedItem.position.module.css";
import styles from "./ClipFeedItem.styles.module.css";

type ClipFeedItemProps = {
  clip: TrainingClip;
  onGenerateTranscript: () => void;
};

// One feed entry: a real media element (video or audio — Voice Practicing
// accepts either) plus whatever's below it: a "Generate transcript"
// button, a generating indicator, or the lyrics-style synced transcript
// once one exists. Tracks its own playhead via the element's real
// `timeupdate` so LyricsTranscript's word highlight follows real
// playback, not a simulated clock.
export function ClipFeedItem({ clip, onGenerateTranscript }: ClipFeedItemProps) {
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
        ) : clip.isGeneratingTranscript ? (
          <p className={`${styles.generating} ${position.generating}`} data-construction>
            Generating transcript…
          </p>
        ) : (
          <button
            type="button"
            className={`${styles.generateButton} ${position.generateButton}`}
            data-construction
            onClick={onGenerateTranscript}
          >
            Generate transcript
          </button>
        )}
      </div>
    </article>
  );
}
