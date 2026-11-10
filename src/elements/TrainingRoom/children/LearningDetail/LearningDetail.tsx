"use client";

import { TranscriptPanel } from "@/elements/TrainingRoom/children/TranscriptPanel/TranscriptPanel";
import type { TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { downloadLearningFile } from "@/lib/training";
import type { VoiceTranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./LearningDetail.position.module.css";
import styles from "./LearningDetail.styles.module.css";

type LearningDetailProps = {
  session: TrainingSession;
  generationByMedia: Record<string, VoiceTranscriptGenerationState>;
  onGenerateTranscript: (fileId: string, diarize: boolean) => void;
  onStopGenerateTranscript: (fileId: string) => void;
  onRetryGenerateTranscript: (fileId: string) => void;
  onDismissGenerateTranscriptError: (fileId: string) => void;
  learningMediaTime: Record<string, number>;
  onSeekMedia: (fileId: string, seconds: number) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Learning's own Detail — not the generic Notes column every other
// discipline gets (see TrainingRoom.data.ts's DetailContentKind comment):
// Learning's notes already live inline in LearningHero's document, so
// this column is entirely about whichever file is currently selected
// there — transcript controls for a video/audio file (reusing the same
// TranscriptPanel ClipFeedItem uses), or a plain file-info/download panel
// for a pdf/epub (text extraction is explicitly future work).
export function LearningDetail({
  session,
  generationByMedia,
  onGenerateTranscript,
  onStopGenerateTranscript,
  onRetryGenerateTranscript,
  onDismissGenerateTranscriptError,
  learningMediaTime,
  onSeekMedia,
}: LearningDetailProps) {
  const learning = session.learning;
  const file = learning?.selectedFileId ? learning.files.find((f) => f.id === learning!.selectedFileId) ?? null : null;

  return (
    <aside className={`${styles.root} ${position.root}`} data-construction>
      {!file ? (
        <p className={`${styles.emptyText} ${position.emptyText}`} data-construction>
          Upload a file to generate a transcript.
        </p>
      ) : file.kind === "document" ? (
        <div className={position.documentPanel} data-construction>
          <p className={`${styles.documentName} ${position.documentName}`} data-construction>
            {file.fileName}
          </p>
          <p className={`${styles.documentMeta} ${position.documentMeta}`} data-construction>
            {file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)}
          </p>
          <button
            type="button"
            className={`${styles.downloadButton} ${position.downloadButton}`}
            data-construction
            onClick={() => downloadLearningFile(session.id, file.storedFileName, file.fileName)}
          >
            Download
          </button>
        </div>
      ) : (
        <TranscriptPanel
          transcriptRaw={file.transcriptRaw}
          wordTimings={file.wordTimings}
          diarize={file.diarize}
          generation={generationByMedia[file.id] ?? null}
          currentTime={learningMediaTime[file.id] ?? 0}
          onSeek={(seconds) => onSeekMedia(file.id, seconds)}
          onGenerate={(diarize) => onGenerateTranscript(file.id, diarize)}
          onStop={() => onStopGenerateTranscript(file.id)}
          onRetry={() => onRetryGenerateTranscript(file.id)}
          onDismiss={() => onDismissGenerateTranscriptError(file.id)}
        />
      )}
    </aside>
  );
}
