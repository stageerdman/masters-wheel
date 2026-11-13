"use client";

import { useState, type RefObject } from "react";
import { MediaPlayer } from "@/elements/MediaPlayer/MediaPlayer";
import { MetaPanel } from "./children/MetaPanel/MetaPanel";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./Hero.position.module.css";
import styles from "./Hero.styles.module.css";

type HeroProps = {
  video: VideoRecord;
  heroSrc: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  notes: string;
  onNotesChange: (value: string) => void;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClosedDateChange: (value: string | null) => void;
  onTitleChange: (value: string) => void;
  onRequestVideoUpload: () => void;
};

export function Hero({
  video,
  heroSrc,
  videoRef,
  notes,
  onNotesChange,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
  onDateChange,
  onClosedDateChange,
  onTitleChange,
  onRequestVideoUpload,
}: HeroProps) {
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
      <div className={position.textSlot} data-construction>
        <textarea
          className={`${styles.notes} ${position.notes}`}
          data-construction
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notes"
          aria-label="Notes"
        />
      </div>
    </section>
  );
}
