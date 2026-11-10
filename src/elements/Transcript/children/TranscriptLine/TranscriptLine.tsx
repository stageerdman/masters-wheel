import type { CSSProperties, MouseEvent } from "react";
import position from "./TranscriptLine.position.module.css";
import styles from "./TranscriptLine.styles.module.css";

type TranscriptLineProps = {
  speaker: string;
  time: string;
  text: string;
  color: string;
  // Consecutive lines from the same speaker collapse the repeated name
  // label (chat-app convention) — the colored rail still marks every line.
  showSpeaker: boolean;
  onSeek: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function TranscriptLine({ speaker, time, text, color, showSpeaker, onSeek, onContextMenu }: TranscriptLineProps) {
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root}`}
      data-construction
      style={{ "--speaker-color": color } as CSSProperties}
      onClick={onSeek}
      onContextMenu={onContextMenu}
      title={`${speaker} · ${time} — right-click for options`}
    >
      <span className={position.meta} data-construction>
        {showSpeaker && (
          <span className={`${styles.speaker} ${position.speaker}`} data-construction>
            {speaker}
          </span>
        )}
        <span className={`${styles.time} ${position.time}`} data-construction>
          {time}
        </span>
      </span>
      <span className={`${styles.text} ${position.text}`} data-construction>
        {text}
      </span>
    </button>
  );
}
