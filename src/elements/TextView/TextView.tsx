import { Transcript } from "@/elements/Transcript/Transcript";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./TextView.position.module.css";
import styles from "./TextView.styles.module.css";

type TextViewProps = {
  kind: ContentKind;
  video: VideoRecord;
  notes: string;
  lessons: string;
  aiAnalysis: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
  onAiAnalysisChange: (value: string) => void;
  onRequestTranscriptUpload: () => void;
  onRequestGenerateTranscript: () => void;
  transcriptGeneration: TranscriptGenerationState | null;
  onStopGenerateTranscript: () => void;
  onRetryGenerateTranscript: () => void;
  onDismissGenerateTranscriptError: () => void;
  onSeekTranscript: (seconds: number) => void;
  onRenameTranscriptSpeaker: (from: string, to: string) => void;
};

// Renders whichever text type is active.
export function TextView({
  kind,
  video,
  notes,
  lessons,
  aiAnalysis,
  onNotesChange,
  onLessonsChange,
  onAiAnalysisChange,
  onRequestTranscriptUpload,
  onRequestGenerateTranscript,
  transcriptGeneration,
  onStopGenerateTranscript,
  onRetryGenerateTranscript,
  onDismissGenerateTranscriptError,
  onSeekTranscript,
  onRenameTranscriptSpeaker,
}: TextViewProps) {
  if (kind === "ai") {
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={aiAnalysis}
        onChange={(event) => onAiAnalysisChange(event.target.value)}
        placeholder="AI analysis"
      />
    );
  }

  if (kind === "transcript") {
    return (
      <Transcript
        rawText={video.transcriptRaw}
        generation={transcriptGeneration}
        onRequestUpload={onRequestTranscriptUpload}
        onRequestGenerate={onRequestGenerateTranscript}
        onStopGenerate={onStopGenerateTranscript}
        onRetryGenerate={onRetryGenerateTranscript}
        onDismissGenerateError={onDismissGenerateTranscriptError}
        onSeek={onSeekTranscript}
        onRenameSpeaker={onRenameTranscriptSpeaker}
      />
    );
  }

  if (kind === "notes") {
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notes"
      />
    );
  }

  return (
    <textarea
      className={`${styles.editableText} ${position.editableText}`}
      data-construction
      value={lessons}
      onChange={(event) => onLessonsChange(event.target.value)}
      placeholder="Core lessons"
    />
  );
}
