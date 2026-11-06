"use client";

import { useState } from "react";
import type { TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { ClipFeedItem } from "./children/ClipFeedItem/ClipFeedItem";
import position from "./Hero.position.module.css";
import styles from "./Hero.styles.module.css";

type HeroProps = {
  session: TrainingSession;
  onNameChange: (name: string) => void;
  onOpenUpload: () => void;
  onGenerateTranscript: (clipId: string) => void;
};

export function Hero({ session, onNameChange, onOpenUpload, onGenerateTranscript }: HeroProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Switching to a different session while mid-edit shouldn't leave the
  // title input open against the newly selected session — same pattern as
  // Performance Review's Hero.
  const [renderedForId, setRenderedForId] = useState(session.id);
  if (session.id !== renderedForId) {
    setRenderedForId(session.id);
    setIsEditingTitle(false);
  }

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.titleBlock} data-construction>
        {isEditingTitle ? (
          <input
            className={`${styles.titleInput} ${position.titleInput}`}
            data-construction
            value={session.name}
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
            }}
            aria-label="Session name"
          />
        ) : (
          <h1
            className={`${styles.title} ${position.title}`}
            data-construction
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
          >
            {session.name}
          </h1>
        )}
      </div>
      <div className={`${styles.feedSlot} ${position.feedSlot}`} data-construction>
        {session.clips.length === 0 ? (
          <button
            type="button"
            className={`${styles.uploadButton} ${position.uploadButton}`}
            data-construction
            onClick={onOpenUpload}
          >
            Upload a clip
          </button>
        ) : (
          <div className={position.feed} data-construction>
            <button
              type="button"
              className={`${styles.addClipButton} ${position.addClipButton}`}
              data-construction
              onClick={onOpenUpload}
            >
              + Add another clip
            </button>
            {session.clips.map((clip) => (
              <ClipFeedItem key={clip.id} clip={clip} onGenerateTranscript={() => onGenerateTranscript(clip.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
