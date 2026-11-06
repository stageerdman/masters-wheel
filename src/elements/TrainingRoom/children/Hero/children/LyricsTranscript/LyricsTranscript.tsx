"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseTranscript, type TranscriptEntry } from "@/lib/transcript";
import position from "./LyricsTranscript.position.module.css";
import styles from "./LyricsTranscript.styles.module.css";

type LyricsTranscriptProps = {
  rawText: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
};

type WordSpan = { text: string; start: number; end: number };

// Average seconds a spoken word takes — only used to extrapolate the very
// last line's end time, which has no "next line" to bound it.
const FALLBACK_SECONDS_PER_WORD = 0.4;

// Real per-word timestamps aren't persisted yet (ElevenLabs returns them,
// but src/lib/transcript/generate.ts currently discards them at
// serialize time — see this update's wiki.md). Approximates them by
// splitting each line's [start, next-line-start) window evenly across its
// words — good enough to drive a convincing karaoke-style highlight today,
// swappable for real per-word data later without changing this component.
function computeWordSpans(entries: TranscriptEntry[]): WordSpan[][] {
  return entries.map((entry, index) => {
    const words = entry.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const next = entries[index + 1];
    const minDuration = words.length * 0.1;
    const lineEnd = next ? Math.max(next.seconds, entry.seconds + minDuration) : entry.seconds + words.length * FALLBACK_SECONDS_PER_WORD;
    const duration = lineEnd - entry.seconds;
    return words.map((text, wordIndex) => ({
      text,
      start: entry.seconds + (duration * wordIndex) / words.length,
      end: entry.seconds + (duration * (wordIndex + 1)) / words.length,
    }));
  });
}

function activeIndex(spans: { start: number; end: number }[], time: number): number {
  for (let i = spans.length - 1; i >= 0; i--) {
    if (time >= spans[i].start) return i;
  }
  return -1;
}

// Lyrics-style synced transcript: the word currently being spoken
// highlights as the clip plays, like Spotify's synced lyrics view.
// Clicking any word seeks the clip to that word's computed start time.
export function LyricsTranscript({ rawText, currentTime, onSeek }: LyricsTranscriptProps) {
  const parsed = useMemo(() => parseTranscript(rawText), [rawText]);
  const wordSpansPerLine = useMemo(() => (parsed ? computeWordSpans(parsed.entries) : []), [parsed]);
  const lineStarts = useMemo(() => parsed?.entries.map((entry) => entry.seconds) ?? [], [parsed]);

  const activeLine = activeIndex(
    lineStarts.map((start) => ({ start, end: start })),
    currentTime
  );
  const activeWord = activeLine >= 0 ? activeIndex(wordSpansPerLine[activeLine] ?? [], currentTime) : -1;

  const activeLineRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLine]);

  if (!parsed) return null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {parsed.entries.map((entry, lineIndex) => (
        <p
          key={lineIndex}
          ref={lineIndex === activeLine ? activeLineRef : undefined}
          className={`${styles.line} ${position.line} ${lineIndex === activeLine ? styles.lineActive : ""}`}
          data-construction
        >
          {wordSpansPerLine[lineIndex].map((word, wordIndex) => (
            <span
              key={wordIndex}
              className={`${styles.word} ${
                lineIndex === activeLine && wordIndex === activeWord ? styles.wordActive : ""
              }`}
              data-construction
              onClick={() => onSeek(word.start)}
            >
              {word.text}{" "}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
