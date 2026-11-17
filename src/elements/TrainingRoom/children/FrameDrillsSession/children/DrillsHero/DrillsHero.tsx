"use client";

import { useState } from "react";
import { DrillCard } from "./children/DrillCard/DrillCard";
import type { useFrameDrillsSession } from "../../FrameDrillsSession.script";
import position from "./DrillsHero.position.module.css";
import styles from "./DrillsHero.styles.module.css";

type DrillsHeroProps = {
  sessionId: string;
  name: string;
  onNameChange: (name: string) => void;
  drills: ReturnType<typeof useFrameDrillsSession>;
  onBeforeRecord: () => void;
};

// Frame Drills' Hero — same shape as Voice Training's Hero: click-to-rename
// title, then a feed (newest on top) with "+ New drill" pinned above it.
export function DrillsHero({ sessionId, name, onNameChange, drills, onBeforeRecord }: DrillsHeroProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Same "don't carry an open title edit into another session" reset as
  // Voice Training's Hero.
  const [renderedForId, setRenderedForId] = useState(sessionId);
  if (sessionId !== renderedForId) {
    setRenderedForId(sessionId);
    setIsEditingTitle(false);
  }

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.titleBlock} data-construction>
        {isEditingTitle ? (
          <input
            className={`${styles.titleInput} ${position.titleInput}`}
            data-construction
            value={name}
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
            {name}
          </h1>
        )}
      </div>
      <div className={`${styles.feedSlot} ${position.feedSlot}`} data-construction>
        {drills.drills.length === 0 ? (
          <button
            type="button"
            className={`${styles.emptyButton} ${position.emptyButton}`}
            data-construction
            onClick={() => drills.addDrill("")}
          >
            Add a frame to drill
          </button>
        ) : (
          <div className={position.feed} data-construction>
            <button
              type="button"
              className={`${styles.addButton} ${position.addButton}`}
              data-construction
              onClick={() => drills.addDrill("")}
            >
              + New drill
            </button>
            {drills.drills.map((drill) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                templates={drills.templates}
                isRecording={drills.activeDrillId === drill.id}
                isOtherRecording={drills.activeDrillId !== null && drills.activeDrillId !== drill.id}
                elapsedMs={drills.activeDrillId === drill.id ? drills.elapsedMs : 0}
                isTimeUp={drills.timeUpDrillId === drill.id}
                micError={drills.micError?.drillId === drill.id ? drills.micError.text : null}
                autoFocus={drills.focusDrillId === drill.id}
                onFocused={drills.clearFocusDrill}
                onTextChange={(text) => drills.setDrillText(drill.id, text)}
                onTimerChange={(seconds) => drills.setDrillTimer(drill.id, seconds)}
                onPlay={() => void drills.startRecording(drill, onBeforeRecord)}
                onStop={drills.stopRecording}
                onSaveTemplate={(target) => drills.saveAsTemplate(drill.text, target)}
                onRemove={() => void drills.removeDrill(drill)}
                downloadedTakeId={drills.downloadedTakeId}
                onDownloadTake={(take, takeNumber) => void drills.downloadTake(drill, take, takeNumber)}
                onDeleteTake={(take) => drills.deleteTake(drill.id, take)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
