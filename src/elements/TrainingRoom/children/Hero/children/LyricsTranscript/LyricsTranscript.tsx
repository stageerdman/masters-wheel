"use client";

import { useEffect, useMemo, useRef } from "react";
import { activeEntryIndex, type TranscriptEntry } from "@/lib/transcript";
import type { DiarizedWord } from "@/lib/transcript/generate";
import position from "./LyricsTranscript.position.module.css";
import styles from "./LyricsTranscript.styles.module.css";

type LyricsTranscriptProps = {
  entries: TranscriptEntry[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  // Real per-word timestamps behind the transcript (ElevenLabs, see
  // src/lib/training's StoredClipMeta). Present → word-by-word highlight.
  // Absent (an uploaded transcript — Fathom, ~/dev/transcriber — or one
  // generated before this field existed) → whole-line highlight only;
  // never faked word timing.
  wordTimings?: DiarizedWord[] | null;
};

type WordSpan = { text: string; start: number };

// Real word spans bucketed into each displayed line by time window rather
// than by re-matching text: a line's own [mm:ss] heading is rounded to whole
// seconds on serialize/parse (see src/lib/transcript/index.ts), but
// wordTimings' floats aren't, so bucketing `word.start` against the line
// boundaries is still exact enough. `null` for a line with no real words in
// its window (or an untimed line) — that line just renders as plain text
// with the line-level highlight.
function bucketWords(entries: TranscriptEntry[], wordTimings: DiarizedWord[]): (WordSpan[] | null)[] {
  return entries.map((entry, index) => {
    if (entry.seconds === null) return null;
    const start = entry.seconds;
    const nextStart = entries.slice(index + 1).find((next) => next.seconds !== null)?.seconds ?? null;
    const words = wordTimings
      .filter((word) => word.start >= start && (nextStart === null || word.start < nextStart))
      .map((word) => ({ text: word.text, start: word.start }));
    return words.length > 0 ? words : null;
  });
}

function activeWordIndex(words: WordSpan[], time: number): number {
  for (let i = words.length - 1; i >= 0; i--) {
    if (time >= words[i].start) return i;
  }
  return -1;
}

// Lyrics-style synced transcript for a single-speaker recording (see
// TranscriptPanel for the speaker-count switch): the current line
// highlights as the clip plays, like Spotify's synced lyrics view — and,
// when real word timings exist, the word being spoken too. Clicking a word
// (or a whole line, without word timings) seeks there.
export function LyricsTranscript({ entries, currentTime, onSeek, wordTimings }: LyricsTranscriptProps) {
  const wordsPerLine = useMemo(
    () => (wordTimings && wordTimings.length > 0 ? bucketWords(entries, wordTimings) : entries.map(() => null)),
    [entries, wordTimings]
  );

  const activeLine = activeEntryIndex(entries, currentTime);
  const activeLineWords = activeLine >= 0 ? wordsPerLine[activeLine] : null;
  const activeWord = activeLineWords ? activeWordIndex(activeLineWords, currentTime) : -1;

  const activeLineRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLine]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {entries.map((entry, lineIndex) => {
        const words = wordsPerLine[lineIndex];
        const isActive = lineIndex === activeLine;
        const seconds = entry.seconds;
        return (
          <p
            key={lineIndex}
            ref={isActive ? activeLineRef : undefined}
            className={`${styles.line} ${position.line} ${isActive ? styles.lineActive : ""} ${
              seconds !== null && !words ? styles.lineSeekable : ""
            }`}
            data-construction
            onClick={seconds !== null && !words ? () => onSeek(seconds) : undefined}
          >
            {words
              ? words.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className={`${styles.word} ${isActive && wordIndex === activeWord ? styles.wordActive : ""}`}
                    data-construction
                    onClick={() => onSeek(word.start)}
                  >
                    {word.text}{" "}
                  </span>
                ))
              : entry.text}
          </p>
        );
      })}
    </div>
  );
}
