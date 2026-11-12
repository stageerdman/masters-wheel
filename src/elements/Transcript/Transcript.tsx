"use client";

import { useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { parseTranscript, speakersOf } from "@/lib/transcript";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import { SpeakerTranscript } from "@/elements/SpeakerTranscript/SpeakerTranscript";
import { TranscriptEmptyState } from "./children/TranscriptEmptyState/TranscriptEmptyState";
import { TranscriptGenerating } from "./children/TranscriptGenerating/TranscriptGenerating";
import { SpeakerContextMenu } from "./children/SpeakerContextMenu/SpeakerContextMenu";
import position from "./Transcript.position.module.css";
import styles from "./Transcript.styles.module.css";

type LineMenuState = { x: number; y: number; speaker: string; text: string };
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
  canUndo: boolean;
  onUndo: () => void;
};

// Renders a parsed transcript.md: color-coded per speaker, click a line to
// seek the video there, right-click a line for a small menu — Rename opens
// the existing speaker-rename popover (renames every line by that speaker,
// in both the UI and transcript.md — see PerformanceReview.script.ts's
// renameTranscriptSpeaker); Copy puts that line's full text on the
// clipboard. Renaming onto a name that already belongs to a *different*
// speaker confirms first, since that merges two real speakers into one. A
// small toolbar above the lines offers one step of undo for that (or any
// rename) and re-running transcription from scratch. No transcript yet
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
  canUndo,
  onUndo,
}: TranscriptProps) {
  const [lineMenu, setLineMenu] = useState<LineMenuState | null>(null);
  const [renameMenu, setRenameMenu] = useState<SpeakerMenuState | null>(null);

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

  function handleContextMenu(event: ReactMouseEvent, speaker: string, text: string) {
    event.preventDefault();
    setLineMenu({
      x: Math.min(event.clientX, window.innerWidth - 200),
      y: Math.min(event.clientY, window.innerHeight - 100),
      speaker,
      text,
    });
  }

  // Renaming onto a name that already belongs to a *different* speaker
  // merges them into one — that can't be split back apart by a plain
  // undo of this one rename (the other speaker's own lines are affected
  // too), so it confirms first. An ordinary rename (new name, or the same
  // speaker) proceeds immediately.
  async function handleRenameSubmit(name: string) {
    const from = renameMenu?.speaker;
    if (!from) return;
    const collides = name !== from && speakers.includes(name);
    if (collides) {
      const confirmed = await confirm(`Merge "${from}" into the existing speaker "${name}"?`, {
        title: "Merge speakers",
        kind: "warning",
      });
      if (!confirmed) return;
    }
    onRenameSpeaker(from, name);
    setRenameMenu(null);
  }

  const lineMenuItems: ContextMenuItem[] = lineMenu
    ? [
        {
          id: "rename",
          label: "Rename",
          onSelect: () => setRenameMenu({ x: lineMenu.x, y: lineMenu.y, speaker: lineMenu.speaker }),
        },
        {
          id: "copy",
          label: "Copy",
          onSelect: () => void writeText(lineMenu.text),
        },
      ]
    : [];

  async function handleRegenerate() {
    const confirmed = await confirm("Regenerate the transcript? This discards the current one, including any renames.", {
      title: "Regenerate transcript",
      kind: "warning",
    });
    if (confirmed) onRequestGenerate();
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.toolbar} data-construction>
        <button
          type="button"
          className={`${styles.toolbarButton} ${position.toolbarButton}`}
          data-construction
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo last rename"
          aria-label="Undo last rename"
        >
          ↺
        </button>
        <button
          type="button"
          className={`${styles.toolbarButton} ${position.toolbarButton}`}
          data-construction
          onClick={handleRegenerate}
          title="Regenerate transcript"
          aria-label="Regenerate transcript"
        >
          ⟳
        </button>
      </div>
      <SpeakerTranscript
        entries={parsed.entries}
        onSeek={onSeek}
        onLineContextMenu={(event, entry) => handleContextMenu(event, entry.speaker, entry.text)}
      />
      {lineMenu && (
        <ContextMenu x={lineMenu.x} y={lineMenu.y} items={lineMenuItems} onClose={() => setLineMenu(null)} />
      )}
      {renameMenu && (
        <SpeakerContextMenu
          x={renameMenu.x}
          y={renameMenu.y}
          initialName={renameMenu.speaker}
          onSubmit={(name) => void handleRenameSubmit(name)}
          onClose={() => setRenameMenu(null)}
        />
      )}
    </div>
  );
}
