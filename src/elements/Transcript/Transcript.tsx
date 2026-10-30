"use client";

import { useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { formatTimestamp, parseTranscript, speakersOf } from "@/lib/transcript";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import { TranscriptLine } from "./children/TranscriptLine/TranscriptLine";
import { TranscriptEmptyState } from "./children/TranscriptEmptyState/TranscriptEmptyState";
import { TranscriptGenerating } from "./children/TranscriptGenerating/TranscriptGenerating";
import { SpeakerContextMenu } from "./children/SpeakerContextMenu/SpeakerContextMenu";
import position from "./Transcript.position.module.css";
import styles from "./Transcript.styles.module.css";

const SPEAKER_COLORS = [
  "var(--color-speaker-1)",
  "var(--color-speaker-2)",
  "var(--color-speaker-3)",
  "var(--color-speaker-4)",
];

type SpeakerMenuState = { x: number; y: number; speaker: string };

type TranscriptProps = {
  rawText: string | null;
  generation: TranscriptGenerationState | null;
  onRequestUpload: () => void;
  onRequestGenerate: () => void;
  onStopGenerate: () => void;
  onRetryGenerate: () => void;
  onDismissGenerateError: () => void;
  onSeek: (seconds: number) => void;
  onRenameSpeaker: (from: string, to: string) => void;
};

// Renders a parsed transcript.md: color-coded per speaker, click a line to
// seek the video there, right-click a line to rename its speaker (renames
// every line by that speaker, in both the UI and transcript.md — see
// PerformanceReview.script.ts's renameTranscriptSpeaker). No transcript yet
// falls back to the upload/generate prompt — unless a Generate Transcript
// job is running (or just failed) for this record, in which case that
// takes over the same slot instead (see TranscriptGenerating).
export function Transcript({
  rawText,
  generation,
  onRequestUpload,
  onRequestGenerate,
  onStopGenerate,
  onRetryGenerate,
  onDismissGenerateError,
  onSeek,
  onRenameSpeaker,
}: TranscriptProps) {
  const [menu, setMenu] = useState<SpeakerMenuState | null>(null);

  const parsed = useMemo(() => (rawText ? parseTranscript(rawText) : null), [rawText]);
  const speakers = useMemo(() => (parsed ? speakersOf(parsed) : []), [parsed]);

  if (!parsed) {
    return (
      <div className={`${styles.root} ${position.root}`} data-construction>
        {generation ? (
          <TranscriptGenerating
            state={generation}
            onStop={onStopGenerate}
            onRetry={onRetryGenerate}
            onDismiss={onDismissGenerateError}
          />
        ) : (
          <TranscriptEmptyState onUpload={onRequestUpload} onGenerate={onRequestGenerate} />
        )}
      </div>
    );
  }

  function colorFor(speaker: string): string {
    const index = Math.max(0, speakers.indexOf(speaker));
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  }

  function handleContextMenu(event: ReactMouseEvent, speaker: string) {
    event.preventDefault();
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 200),
      y: Math.min(event.clientY, window.innerHeight - 100),
      speaker,
    });
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <ul className={position.list} data-construction>
        {parsed.entries.map((entry, index) => (
          <li key={index}>
            <TranscriptLine
              speaker={entry.speaker}
              time={formatTimestamp(entry.seconds)}
              text={entry.text}
              color={colorFor(entry.speaker)}
              showSpeaker={index === 0 || parsed.entries[index - 1].speaker !== entry.speaker}
              onSeek={() => onSeek(entry.seconds)}
              onContextMenu={(event) => handleContextMenu(event, entry.speaker)}
            />
          </li>
        ))}
      </ul>
      {menu && (
        <SpeakerContextMenu
          x={menu.x}
          y={menu.y}
          initialName={menu.speaker}
          onSubmit={(name) => {
            onRenameSpeaker(menu.speaker, name);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
