"use client";

import { useState, type RefObject } from "react";
import { MediaPlayer } from "@/elements/MediaPlayer/MediaPlayer";
import { BookmarkRail } from "@/elements/BookmarkRail/BookmarkRail";
import { TextView } from "@/elements/TextView/TextView";
import { MetaPanel } from "./children/MetaPanel/MetaPanel";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./Hero.position.module.css";
import styles from "./Hero.styles.module.css";

type HeroProps = {
  video: VideoRecord;
  heroSrc: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  notes: string;
  lessons: string;
  aiAnalysis: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
  onAiAnalysisChange: (value: string) => void;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClosedDateChange: (value: string | null) => void;
  onTitleChange: (value: string) => void;
  onRequestTranscriptUpload: () => void;
  onSeekTranscript: (seconds: number) => void;
  onRenameTranscriptSpeaker: (from: string, to: string) => void;
};

export function Hero({
  video,
  heroSrc,
  videoRef,
  notes,
  lessons,
  aiAnalysis,
  onNotesChange,
  onLessonsChange,
  onAiAnalysisChange,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
  onDateChange,
  onClosedDateChange,
  onTitleChange,
  onRequestTranscriptUpload,
  onSeekTranscript,
  onRenameTranscriptSpeaker,
}: HeroProps) {
  const [active, setActive] = useState<ContentKind>("ai");
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
          onOfferedAmountChange={onOfferedAmountChange}
          onOfferedCurrencyChange={onOfferedCurrencyChange}
          onDescriptionChange={onDescriptionChange}
          onDateChange={onDateChange}
          onClosedDateChange={onClosedDateChange}
        />
      </div>
      <div className={position.mediaSlot} data-construction>
        <MediaPlayer ref={videoRef} title={video.title} src={heroSrc} />
      </div>
      <div className={position.railSlot} data-construction>
        <BookmarkRail active={active} onSelect={setActive} />
      </div>
      <div className={position.textSlot} data-construction>
        <TextView
          kind={active}
          video={video}
          notes={notes}
          lessons={lessons}
          aiAnalysis={aiAnalysis}
          onNotesChange={onNotesChange}
          onLessonsChange={onLessonsChange}
          onAiAnalysisChange={onAiAnalysisChange}
          onRequestTranscriptUpload={onRequestTranscriptUpload}
          onSeekTranscript={onSeekTranscript}
          onRenameTranscriptSpeaker={onRenameTranscriptSpeaker}
        />
      </div>
    </section>
  );
}
