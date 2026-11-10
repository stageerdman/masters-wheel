"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseTranscript, type TranscriptEntry } from "@/lib/transcript";
import type { DiarizedWord } from "@/lib/transcript/generate";
import position from "./LyricsTranscript.position.module.css";
import styles from "./LyricsTranscript.styles.module.css";

type LyricsTranscriptProps = {
  rawText: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
  // ElevenLabs' real per-word timestamps behind rawText (see
  // src/lib/training's StoredClipMeta). `null`/absent for a clip
  // transcribed before this field existed — falls back to the approximated
  // spans below rather than losing the highlight entirely.
  wordTimings?: DiarizedWord[] | null;
};

type WordSpan = { text: string; start: number; end: number };

// Average seconds a spoken word takes — only used to extrapolate the very
// last line's end time, which has no "next line" to bound it.
const FALLBACK_SECONDS_PER_WORD = 0.4;

// Splits each line's [start, next-line-start) window evenly across its
// words — the pre-real-timing approximation, kept as a fallback for a
// transcript with no wordTimings (generated before that field existed).
function approximateWordSpans(entries: TranscriptEntry[]): WordSpan[][] {
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

// Real word-for-word spans, bucketed into each displayed line by time
// window rather than by re-matching text: a line's own [mm:ss] heading gets
// rounded to the nearest whole second on serialize/parse (see
// src/lib/transcript/index.ts), but wordTimings' start/end floats are
// untouched by that round-trip (stored as their own JSON field — see
// StoredClipMeta), so bucketing on `word.start` against the (slightly
// rounded) line boundary is still exact enough to drive a real per-word
// highlight. A line that ends up with zero real words — e.g. a rounding
// edge pushed its only word into the next line's bucket — falls back to
// that one line's approximated spans so no line ever renders unclickable.
function computeWordSpans(entries: TranscriptEntry[], wordTimings: DiarizedWord[] | null | undefined): WordSpan[][] {
  if (!wordTimings || wordTimings.length === 0) return approximateWordSpans(entries);

  const approximated = approximateWordSpans(entries);
  return entries.map((entry, index) => {
    const next = entries[index + 1];
    const lineWords = wordTimings.filter(
      (word) => word.start >= entry.seconds && (!next || word.start < next.seconds)
    );
    if (lineWords.length === 0) return approximated[index];
    return lineWords.map((word) => ({ text: word.text, start: word.start, end: word.end }));
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
// Clicking any word seeks the clip to that word's real start time.
export function LyricsTranscript({ rawText, currentTime, onSeek, wordTimings }: LyricsTranscriptProps) {
  const parsed = useMemo(() => parseTranscript(rawText), [rawText]);
  const wordSpansPerLine = useMemo(
    () => (parsed ? computeWordSpans(parsed.entries, wordTimings) : []),
    [parsed, wordTimings]
  );
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
