import { Transcript } from "@/elements/Transcript/Transcript";
import { Scorecard } from "@/elements/Scorecard/Scorecard";
import { QuestionAnalysis } from "@/elements/QuestionAnalysis/QuestionAnalysis";
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
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
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
  isGeneratingQuestionAnalysis: boolean;
  onGenerateQuestionAnalysis: () => void;
  questionAnalysisError: string | null;
};

// Renders whichever text type is active.
export function TextView({
  kind,
  video,
  notes,
  lessons,
  onNotesChange,
  onLessonsChange,
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
  isGeneratingQuestionAnalysis,
  onGenerateQuestionAnalysis,
  questionAnalysisError,
}: TextViewProps) {
  if (kind === "questions") {
    return (
      <QuestionAnalysis
        data={video.questionAnalysis}
        isGenerating={isGeneratingQuestionAnalysis}
        onGenerate={onGenerateQuestionAnalysis}
        onSeek={onSeekTranscript}
        error={questionAnalysisError}
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
