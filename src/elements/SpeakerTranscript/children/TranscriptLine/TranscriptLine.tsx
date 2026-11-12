import type { CSSProperties, MouseEvent } from "react";
import position from "./TranscriptLine.position.module.css";
import styles from "./TranscriptLine.styles.module.css";

type TranscriptLineProps = {
  speaker: string;
  // `null` for an untimed entry — no time label, and not seekable.
  time: string | null;
  text: string;
  color: string;
  // Consecutive lines from the same speaker collapse the repeated name
  // label (chat-app convention) — the colored rail still marks every line.
  showSpeaker: boolean;
  // The line currently playing (only where the caller tracks playback).
  active: boolean;
  onSeek?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function TranscriptLine({
  speaker,
  time,
  text,
  color,
  showSpeaker,
  active,
  onSeek,
  onContextMenu,
}: TranscriptLineProps) {
  const hint = [speaker, time].filter(Boolean).join(" · ") + (onContextMenu ? " — right-click for options" : "");
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""} ${onSeek ? "" : styles.static}`}
      data-construction
      style={{ "--speaker-color": color } as CSSProperties}
      onClick={onSeek}
      onContextMenu={onContextMenu}
      title={hint}
      aria-current={active ? "true" : undefined}
    >
      <span className={position.meta} data-construction>
        {showSpeaker && (
          <span className={`${styles.speaker} ${position.speaker}`} data-construction>
            {speaker}
          </span>
        )}
        {time && (
          <span className={`${styles.time} ${position.time}`} data-construction>
            {time}
          </span>
        )}
      </span>
      <span className={`${styles.text} ${position.text}`} data-construction>
        {text}
      </span>
    </button>
  );
}
