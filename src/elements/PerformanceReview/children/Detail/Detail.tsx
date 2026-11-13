"use client";

import { SplitRail } from "@/elements/SplitRail/SplitRail";
import { TextView } from "@/elements/TextView/TextView";
import { useSplitRail } from "@/lib/splitRail";
import { CONTENT_KIND_META, CONTENT_KIND_ORDER, type VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import type { ScorecardCriterionDef } from "@/lib/settings";
import position from "./Detail.position.module.css";
import styles from "./Detail.styles.module.css";

type DetailProps = {
  video: VideoRecord;
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
  isGeneratingClientCard: boolean;
  onGenerateClientCard: () => void;
  clientCardError: string | null;
};

export function Detail({
  video,
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
  isGeneratingClientCard,
  onGenerateClientCard,
  clientCardError,
}: DetailProps) {
  const {
    railRef,
    linePx,
    topKinds,
    bottomKind,
    isSplit,
    activeTop,
    selectTop,
    beginLineDrag,
    beginBadgeDrag,
    dragOffset,
  } = useSplitRail(CONTENT_KIND_ORDER, "performance-review-detail-split");

  return (
    <aside className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.panes} data-construction>
        <div
          className={position.pane}
          data-construction
          style={isSplit && linePx !== null ? { flex: `0 0 ${linePx}px` } : undefined}
        >
          <TextView
            kind={activeTop}
            video={video}
            onRequestTranscriptUpload={onRequestTranscriptUpload}
            onRequestGenerateTranscript={onRequestGenerateTranscript}
            transcriptGeneration={transcriptGeneration}
            onStopGenerateTranscript={onStopGenerateTranscript}
            onRetryGenerateTranscript={onRetryGenerateTranscript}
            onDismissGenerateTranscriptError={onDismissGenerateTranscriptError}
            onSeekTranscript={onSeekTranscript}
            onRenameTranscriptSpeaker={onRenameTranscriptSpeaker}
            canUndoTranscript={canUndoTranscript}
            onUndoTranscript={onUndoTranscript}
            isGeneratingScorecard={isGeneratingScorecard}
            onGenerateScorecard={onGenerateScorecard}
            scorecardCriteria={scorecardCriteria}
            scorecardError={scorecardError}
            isGeneratingQuestionAnalysis={isGeneratingQuestionAnalysis}
            onGenerateQuestionAnalysis={onGenerateQuestionAnalysis}
            questionAnalysisError={questionAnalysisError}
            isGeneratingClientCard={isGeneratingClientCard}
            onGenerateClientCard={onGenerateClientCard}
            clientCardError={clientCardError}
          />
        </div>
        {isSplit && bottomKind && (
          <>
            <div
              className={`${styles.divider} ${position.divider}`}
              data-construction
              aria-hidden="true"
            />
            <div className={position.pane} data-construction>
              <TextView
                kind={bottomKind}
                video={video}
                onRequestTranscriptUpload={onRequestTranscriptUpload}
                onRequestGenerateTranscript={onRequestGenerateTranscript}
                transcriptGeneration={transcriptGeneration}
                onStopGenerateTranscript={onStopGenerateTranscript}
                onRetryGenerateTranscript={onRetryGenerateTranscript}
                onDismissGenerateTranscriptError={onDismissGenerateTranscriptError}
                onSeekTranscript={onSeekTranscript}
                onRenameTranscriptSpeaker={onRenameTranscriptSpeaker}
                canUndoTranscript={canUndoTranscript}
                onUndoTranscript={onUndoTranscript}
                isGeneratingScorecard={isGeneratingScorecard}
                onGenerateScorecard={onGenerateScorecard}
                scorecardCriteria={scorecardCriteria}
                scorecardError={scorecardError}
                isGeneratingQuestionAnalysis={isGeneratingQuestionAnalysis}
                onGenerateQuestionAnalysis={onGenerateQuestionAnalysis}
                questionAnalysisError={questionAnalysisError}
                isGeneratingClientCard={isGeneratingClientCard}
                onGenerateClientCard={onGenerateClientCard}
                clientCardError={clientCardError}
              />
            </div>
          </>
        )}
      </div>
      <div className={position.railSlot} data-construction>
        <SplitRail
          railRef={railRef}
          metaFor={(kind) => CONTENT_KIND_META[kind]}
          linePx={linePx}
          topKinds={topKinds}
          bottomKind={bottomKind}
          activeTop={activeTop}
          onSelectTop={selectTop}
          onLinePointerDown={beginLineDrag}
          onBadgePointerDown={beginBadgeDrag}
          dragOffset={dragOffset}
        />
      </div>
    </aside>
  );
}
