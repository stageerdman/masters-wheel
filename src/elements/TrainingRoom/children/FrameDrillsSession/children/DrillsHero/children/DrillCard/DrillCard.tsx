"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkSimple, Play, Stop } from "@phosphor-icons/react";
import { ContextMenu } from "@/elements/ContextMenu/ContextMenu";
import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import type { TemplateSaveTarget } from "@/elements/TrainingRoom/children/FrameDrillsSession/FrameDrillsSession.script";
import {
  timerOptionsFor,
  drillClockMs,
  formatDrillClock,
  timerOptionLabel,
  type FrameDrill,
  type FrameTemplate,
} from "@/lib/frameDrills";
import { SaveTemplateMenu } from "./children/SaveTemplateMenu/SaveTemplateMenu";
import position from "./DrillCard.position.module.css";
import styles from "./DrillCard.styles.module.css";

type DrillCardProps = {
  drill: FrameDrill;
  templates: FrameTemplate[];
  isRecording: boolean;
  // Another drill is recording — this one's play is locked out.
  isOtherRecording: boolean;
  elapsedMs: number;
  isTimeUp: boolean;
  micError: string | null;
  autoFocus: boolean;
  onFocused: () => void;
  onTextChange: (text: string) => void;
  onTimerChange: (seconds: number | null) => void;
  onPlay: () => void;
  onStop: () => void;
  onSaveTemplate: (target: TemplateSaveTarget) => void;
  onRemove: () => void;
};

// One drill: the frame's text (with a save-as-template icon beside it),
// then play/stop + its own timer + the live clock, then every recorded
// take, newest first. Play records audio and starts the timer together;
// at zero the "Time's up" pop shows and the clock keeps going into minus.
export function DrillCard({
  drill,
  templates,
  isRecording,
  isOtherRecording,
  elapsedMs,
  isTimeUp,
  micError,
  autoFocus,
  onFocused,
  onTextChange,
  onTimerChange,
  onPlay,
  onStop,
  onSaveTemplate,
  onRemove,
}: DrillCardProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { anchorRef: saveAnchorRef, open: isSaveMenuOpen, anchorRect: saveAnchorRect, toggleOpen: toggleSaveMenu, close: closeSaveMenu } =
    useAnchoredPopup<HTMLButtonElement>();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    textRef.current?.focus();
    onFocused();
  }, [autoFocus, onFocused]);

  // Grows with its content instead of scrolling inside the card.
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [drill.text]);

  const hasText = drill.text.trim().length > 0;
  const clockMs = isRecording ? drillClockMs(elapsedMs, drill.timerSeconds) : drillClockMs(0, drill.timerSeconds);
  const isOvertime = isRecording && drill.timerSeconds !== null && clockMs < 0;
  const takeCount = drill.takes.length;

  return (
    <article
      className={`${styles.root} ${isRecording ? styles.recording : ""} ${position.root}`}
      data-construction
      onContextMenu={(event) => {
        // Inside the text field, keep the native cut/copy/paste menu.
        if (event.target === textRef.current) return;
        event.preventDefault();
        // A drill can't be removed mid-take.
        if (!isRecording) setContextMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <div className={position.textRow} data-construction>
        <textarea
          ref={textRef}
          className={`${styles.text} ${position.text}`}
          data-construction
          rows={1}
          value={drill.text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Write the frame you want to drill…"
          aria-label="Frame to drill"
        />
        <button
          ref={saveAnchorRef}
          type="button"
          className={`${styles.iconButton} ${position.saveButton}`}
          data-construction
          onClick={toggleSaveMenu}
          disabled={!hasText}
          title="Save as template"
          aria-label="Save as template"
        >
          <BookmarkSimple size={18} weight={isSaveMenuOpen ? "fill" : "regular"} />
        </button>
      </div>

      <div className={position.controls} data-construction>
        {isRecording ? (
          <button
            type="button"
            className={`${styles.playButton} ${styles.stopButton} ${position.playButton}`}
            data-construction
            onClick={onStop}
            aria-label="Stop recording"
            title="Stop"
          >
            <Stop size={18} weight="fill" />
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.playButton} ${position.playButton}`}
            data-construction
            onClick={onPlay}
            disabled={isOtherRecording || !hasText}
            aria-label="Record this drill"
            title={isOtherRecording ? "Another drill is recording" : hasText ? "Record" : "Write a frame first"}
          >
            <Play size={18} weight="fill" />
          </button>
        )}
        <select
          className={`${styles.timerSelect} ${position.timerSelect}`}
          data-construction
          value={drill.timerSeconds === null ? "" : String(drill.timerSeconds)}
          onChange={(event) => onTimerChange(event.target.value === "" ? null : Number(event.target.value))}
          disabled={isRecording}
          aria-label="Timer"
        >
          {timerOptionsFor(drill.timerSeconds).map((seconds) => (
            <option key={seconds ?? "none"} value={seconds === null ? "" : String(seconds)}>
              {timerOptionLabel(seconds)}
            </option>
          ))}
        </select>
        {(isRecording || drill.timerSeconds !== null) && (
          <span
            className={`${styles.clock} ${isRecording ? styles.clockLive : ""} ${isOvertime ? styles.clockOvertime : ""} ${position.clock}`}
            data-construction
            role="timer"
            aria-live="off"
          >
            {formatDrillClock(clockMs)}
          </span>
        )}
        {isRecording && (
          <span className={`${styles.recDot} ${position.recDot}`} data-construction aria-label="Recording" />
        )}
        {isTimeUp && (
          <span className={`${styles.timeUp} ${position.timeUp}`} data-construction role="status">
            Time&apos;s up
          </span>
        )}
      </div>

      {micError && (
        <p className={`${styles.error} ${position.error}`} data-construction role="alert">
          {micError}
        </p>
      )}

      {takeCount > 0 && (
        <ol className={position.takes} data-construction>
          {drill.takes.map((take, index) => (
            <li key={take.id} className={position.take} data-construction>
              <span className={`${styles.takeLabel} ${position.takeLabel}`} data-construction>
                Take {takeCount - index} · {formatDrillClock(take.durationMs)}
              </span>
              <audio
                className={`${styles.takeAudio} ${position.takeAudio}`}
                data-construction
                src={take.src}
                controls
                preload="metadata"
              />
            </li>
          ))}
        </ol>
      )}

      {isSaveMenuOpen && saveAnchorRect && (
        <AnchoredPopup anchorRect={saveAnchorRect} onClose={closeSaveMenu}>
          <SaveTemplateMenu
            templates={templates}
            onSave={(target) => {
              onSaveTemplate(target);
              closeSaveMenu();
            }}
          />
        </AnchoredPopup>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[{ id: "remove", label: "Remove drill", tone: "destructive", onSelect: onRemove }]}
        />
      )}
    </article>
  );
}
