"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent } from "react";
import { formatTimestamp, speakersOf, type TranscriptEntry } from "@/lib/transcript";
import { TranscriptLine } from "./children/TranscriptLine/TranscriptLine";
import position from "./SpeakerTranscript.position.module.css";
import styles from "./SpeakerTranscript.styles.module.css";

const SPEAKER_COLORS = [
  "var(--color-speaker-1)",
  "var(--color-speaker-2)",
  "var(--color-speaker-3)",
  "var(--color-speaker-4)",
];

type SpeakerTranscriptProps = {
  entries: TranscriptEntry[];
  // Index of the line currently playing, or -1/absent when the caller
  // doesn't track playback (Performance Review). Scrolled into view.
  activeIndex?: number;
  onSeek: (seconds: number) => void;
  onLineContextMenu?: (event: MouseEvent<HTMLButtonElement>, entry: TranscriptEntry) => void;
};

// The multi-speaker transcript view: one line per block, color-coded per
// speaker with a name label (collapsed for consecutive lines by the same
// speaker) and its timestamp; click a timed line to seek there. Shared by
// Performance Review's Transcript and Training Room's TranscriptPanel
// (which uses it whenever 2+ speakers are present — see there).
export function SpeakerTranscript({ entries, activeIndex = -1, onSeek, onLineContextMenu }: SpeakerTranscriptProps) {
  const speakers = useMemo(() => speakersOf({ meta: [], entries }), [entries]);

  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  function colorFor(speaker: string): string {
    const index = Math.max(0, speakers.indexOf(speaker));
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  }

  return (
    <ul className={`${styles.root} ${position.root}`} data-construction>
      {entries.map((entry, index) => {
        const seconds = entry.seconds;
        return (
          <li key={index} ref={index === activeIndex ? activeRef : undefined}>
            <TranscriptLine
              speaker={entry.speaker}
              time={seconds === null ? null : formatTimestamp(seconds)}
              text={entry.text}
              color={colorFor(entry.speaker)}
              showSpeaker={index === 0 || entries[index - 1].speaker !== entry.speaker}
              active={index === activeIndex}
              onSeek={seconds === null ? undefined : () => onSeek(seconds)}
              onContextMenu={onLineContextMenu ? (event) => onLineContextMenu(event, entry) : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}
