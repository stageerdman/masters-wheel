"use client";

import { DISCIPLINE_SHAPES } from "@/elements/DisciplineIcon/DisciplineIcon";
import { TOOL_TYPE_META, TOOL_TYPE_ORDER, type TrainingToolType } from "../../TrainingRoom.data";
import { DisciplineFrame } from "./children/DisciplineFrame/DisciplineFrame";
import { useDisciplinePicker } from "./DisciplinePicker.script";
import position from "./DisciplinePicker.position.module.css";
import styles from "./DisciplinePicker.styles.module.css";

type DisciplinePickerProps = {
  onClose: () => void;
  onSelect: (toolType: TrainingToolType) => void;
};

const CREST_BY_TOOL_TYPE: Record<TrainingToolType, string> = {
  voiceTraining: "#i-waves",
  chatRoleplay: "#i-circles-chat",
  voiceRoleplay: "#i-circles-voice",
  mindsetShifting: "#i-soul",
  learning: "#i-book",
  frameDrills: "#i-frame",
};

// Training Room's full-bleed "choose your discipline" cabinet-select
// takeover, opened from Navigation's "Add a discipline" row — TrainingRoom
// only mounts this component while the picker is actually open (see
// TrainingRoom.tsx), rather than this component watching an isOpen prop
// itself. Deliberately not a dialog-over-dimmed-content modal like
// VideoUploadModal — it replaces the whole view. A click anywhere that
// isn't a DisciplineFrame bubbles up to this root and closes it (each
// frame stops propagation on a real selection, see DisciplineFrame.tsx);
// Escape does the same (see DisciplinePicker.script.ts).
export function DisciplinePicker({ onClose, onSelect }: DisciplinePickerProps) {
  const { confirmingToolType, choose, rootRef } = useDisciplinePicker(onClose, onSelect);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${position.root}`}
      data-construction
      role="dialog"
      aria-modal="true"
      aria-label="Choose a discipline"
      tabIndex={-1}
      onClick={onClose}
    >
      <svg className={position.sprite} aria-hidden="true">
        <defs>
          <linearGradient id="discipline-gold-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0c17e" />
            <stop offset="45%" stopColor="#a8936c" />
            <stop offset="70%" stopColor="#5c5138" />
            <stop offset="100%" stopColor="#cdb378" />
          </linearGradient>
        </defs>
        {/* Every discipline crest below renders the exact same geometry as
            DisciplineIcon (the flat item icon used in SessionListItem/
            TagChip) via DISCIPLINE_SHAPES — painted gold-foil here, painted
            currentColor there, so the two never drift apart. */}
        <symbol id="i-waves" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.voiceTraining("url(#discipline-gold-foil)")}</symbol>
        <symbol id="i-circles-chat" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.chatRoleplay("url(#discipline-gold-foil)")}</symbol>
        <symbol id="i-circles-voice" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.voiceRoleplay("url(#discipline-gold-foil)")}</symbol>
        <symbol id="i-soul" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.mindsetShifting("url(#discipline-gold-foil)")}</symbol>
        <symbol id="i-book" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.learning("url(#discipline-gold-foil)")}</symbol>
        <symbol id="i-frame" viewBox="0 0 100 100">{DISCIPLINE_SHAPES.frameDrills("url(#discipline-gold-foil)")}</symbol>
        {/* Card decoration: corner scrollwork, a 4-point sparkle, a small lock, a checkmark badge. */}
        <symbol id="discipline-i-scroll" viewBox="0 0 24 24">
          <path
            d="M20 20 C20 10 12 2 2 2 C9 2 14 7 14 14 C14 18 11 20 7 20 C10 18 10 15 8 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="discipline-i-sparkle" viewBox="0 0 16 16">
          <path d="M8 0 C8.6 5.2 9.2 6.8 16 8 C9.2 9.2 8.6 10.8 8 16 C7.4 10.8 6.8 9.2 0 8 C6.8 6.8 7.4 5.2 8 0 Z" />
        </symbol>
        <symbol id="discipline-i-lock" viewBox="0 0 24 24">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </symbol>
        <symbol id="discipline-i-check" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" />
          <path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#19140f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </svg>
      <p className={`${styles.kicker} ${position.kicker}`} data-construction>
        Training Room
      </p>
      <h2 className={`${styles.title} ${position.title}`} data-construction>
        Choose Your Discipline
      </h2>
      <div className={`${styles.rule} ${position.rule}`} data-construction />
      <div className={position.grid} data-construction>
        {TOOL_TYPE_ORDER.map((toolType) => {
          const meta = TOOL_TYPE_META[toolType];
          return (
            <DisciplineFrame
              key={toolType}
              label={meta.label}
              description={meta.description}
              locked={meta.locked}
              accentColor={meta.color}
              crestHref={CREST_BY_TOOL_TYPE[toolType]}
              isConfirming={confirmingToolType === toolType}
              onSelect={() => choose(toolType)}
            />
          );
        })}
      </div>
    </div>
  );
}
