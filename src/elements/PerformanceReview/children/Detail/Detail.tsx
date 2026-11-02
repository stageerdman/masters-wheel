"use client";

import { SplitRail } from "./children/SplitRail/SplitRail";
import { TextView } from "@/elements/TextView/TextView";
import { useSplitRail } from "./Detail.script";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import position from "./Detail.position.module.css";
import styles from "./Detail.styles.module.css";

type DetailProps = {
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
  isGeneratingScorecard: boolean;
  onGenerateScorecard: () => void;
};

export function Detail({
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
  isGeneratingScorecard,
  onGenerateScorecard,
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
  } = useSplitRail();

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
            notes={notes}
            lessons={lessons}
            aiAnalysis={aiAnalysis}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
            onAiAnalysisChange={onAiAnalysisChange}
            onRequestTranscriptUpload={onRequestTranscriptUpload}
            onRequestGenerateTranscript={onRequestGenerateTranscript}
            transcriptGeneration={transcriptGeneration}
            onStopGenerateTranscript={onStopGenerateTranscript}
            onRetryGenerateTranscript={onRetryGenerateTranscript}
            onDismissGenerateTranscriptError={onDismissGenerateTranscriptError}
            onSeekTranscript={onSeekTranscript}
            onRenameTranscriptSpeaker={onRenameTranscriptSpeaker}
            isGeneratingScorecard={isGeneratingScorecard}
            onGenerateScorecard={onGenerateScorecard}
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
                notes={notes}
                lessons={lessons}
                aiAnalysis={aiAnalysis}
                onNotesChange={onNotesChange}
                onLessonsChange={onLessonsChange}
                onAiAnalysisChange={onAiAnalysisChange}
                onRequestTranscriptUpload={onRequestTranscriptUpload}
                onRequestGenerateTranscript={onRequestGenerateTranscript}
                transcriptGeneration={transcriptGeneration}
                onStopGenerateTranscript={onStopGenerateTranscript}
                onRetryGenerateTranscript={onRetryGenerateTranscript}
                onDismissGenerateTranscriptError={onDismissGenerateTranscriptError}
                onSeekTranscript={onSeekTranscript}
                onRenameTranscriptSpeaker={onRenameTranscriptSpeaker}
                isGeneratingScorecard={isGeneratingScorecard}
                onGenerateScorecard={onGenerateScorecard}
              />
            </div>
          </>
        )}
      </div>
      <div className={position.railSlot} data-construction>
        <SplitRail
          railRef={railRef}
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
