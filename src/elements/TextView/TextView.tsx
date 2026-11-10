import { Transcript } from "@/elements/Transcript/Transcript";
import { Scorecard } from "@/elements/Scorecard/Scorecard";
import type { ContentKind, VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import type { ScorecardCriterionDef } from "@/lib/settings";
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
  canUndoTranscript: boolean;
  onUndoTranscript: () => void;
  isGeneratingScorecard: boolean;
  onGenerateScorecard: () => void;
  scorecardCriteria: ScorecardCriterionDef[];
  scorecardError: string | null;
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
  canUndoTranscript,
  onUndoTranscript,
  isGeneratingScorecard,
  onGenerateScorecard,
  scorecardCriteria,
  scorecardError,
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
        canUndo={canUndoTranscript}
        onUndo={onUndoTranscript}
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

  if (kind === "scorecard") {
    return (
      <Scorecard
        scorecard={video.scorecard}
        isGenerating={isGeneratingScorecard}
        onGenerate={onGenerateScorecard}
        onSeek={onSeekTranscript}
        criteria={scorecardCriteria}
        error={scorecardError}
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
