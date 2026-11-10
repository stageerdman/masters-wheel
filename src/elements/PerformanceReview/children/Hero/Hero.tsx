"use client";

import { useState, type RefObject } from "react";
import { MediaPlayer } from "@/elements/MediaPlayer/MediaPlayer";
import { BookmarkRail } from "@/elements/BookmarkRail/BookmarkRail";
import { TextView } from "@/elements/TextView/TextView";
import { MetaPanel } from "./children/MetaPanel/MetaPanel";
import { usePersistedActiveKind } from "./Hero.script";
import { CONTENT_KIND_META, CONTENT_KIND_ORDER, type VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { TranscriptGenerationState } from "@/lib/transcript/generate";
import type { ScorecardCriterionDef } from "@/lib/settings";
import position from "./Hero.position.module.css";
import styles from "./Hero.styles.module.css";

type HeroProps = {
  video: VideoRecord;
  heroSrc: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  notes: string;
  lessons: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClosedDateChange: (value: string | null) => void;
  onTitleChange: (value: string) => void;
  onRequestTranscriptUpload: () => void;
  onRequestGenerateTranscript: () => void;
  transcriptGeneration: TranscriptGenerationState | null;
  onStopGenerateTranscript: () => void;
  onRetryGenerateTranscript: () => void;
  onDismissGenerateTranscriptError: () => void;
  onRequestVideoUpload: () => void;
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

export function Hero({
  video,
  heroSrc,
  videoRef,
  notes,
  lessons,
  onNotesChange,
  onLessonsChange,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
  onDateChange,
  onClosedDateChange,
  onTitleChange,
  onRequestTranscriptUpload,
  onRequestGenerateTranscript,
  transcriptGeneration,
  onStopGenerateTranscript,
  onRetryGenerateTranscript,
  onDismissGenerateTranscriptError,
  onRequestVideoUpload,
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
}: HeroProps) {
  const [active, setActive] = usePersistedActiveKind();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Switching to a different record while mid-edit shouldn't leave the
  // title input open against the newly selected record. Adjusted during
  // render (React's recommended pattern for this) rather than an effect.
  const [renderedForId, setRenderedForId] = useState(video.id);
  if (video.id !== renderedForId) {
    setRenderedForId(video.id);
    setIsEditingTitle(false);
  }

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.titleBlock} data-construction>
        {isEditingTitle ? (
          <input
            className={`${styles.titleInput} ${position.titleInput}`}
            data-construction
            value={video.title}
            autoFocus
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                event.currentTarget.blur();
              }
            }}
            aria-label="Record title"
          />
        ) : (
          <h1
            className={`${styles.title} ${position.title}`}
            data-construction
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
          >
            {video.title}
          </h1>
        )}
        <MetaPanel
          offeredAmount={video.offeredAmount}
          offeredCurrency={video.offeredCurrency}
          description={video.description}
          date={video.date}
          closedDate={video.closedDate}
          isWon={video.state === "closed"}
          onOfferedAmountChange={onOfferedAmountChange}
          onOfferedCurrencyChange={onOfferedCurrencyChange}
          onDescriptionChange={onDescriptionChange}
          onDateChange={onDateChange}
          onClosedDateChange={onClosedDateChange}
        />
      </div>
      <div className={position.mediaSlot} data-construction>
        {heroSrc ? (
          <MediaPlayer ref={videoRef} title={video.title} src={heroSrc} />
        ) : (
          <button
            type="button"
            className={`${styles.uploadButton} ${position.uploadButton}`}
            data-construction
            onClick={onRequestVideoUpload}
          >
            Upload video
          </button>
        )}
      </div>
      <div className={position.railSlot} data-construction>
        <BookmarkRail
          kinds={CONTENT_KIND_ORDER}
          metaFor={(kind) => CONTENT_KIND_META[kind]}
          active={active}
          onSelect={setActive}
        />
      </div>
      <div className={position.textSlot} data-construction>
        <TextView
          kind={active}
          video={video}
          notes={notes}
          lessons={lessons}
          onNotesChange={onNotesChange}
          onLessonsChange={onLessonsChange}
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
        />
      </div>
    </section>
  );
}
