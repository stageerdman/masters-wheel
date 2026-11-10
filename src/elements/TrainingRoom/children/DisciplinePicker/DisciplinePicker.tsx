"use client";

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
        {/* Voice Training — two offset waveforms (the imitated voice, the
            original voice) settling into one merged wave: aligning two
            voices into one. */}
        <symbol id="i-waves" viewBox="0 0 100 100">
          <path
            d="M4 28 Q15 16 26 28 Q36 44 44 50"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d="M4 72 Q15 84 26 72 Q36 56 44 50"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d="M44 50 Q58 24 72 50 Q86 76 96 50"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </symbol>
        {/* Chat Roleplay — overlapping circles: your circle meeting the AI
            prospect's, with the three small dots (the old speech-bubble
            ellipsis) marking the typed exchange where they overlap. */}
        <symbol id="i-circles-chat" viewBox="0 0 100 100">
          <circle cx="50" cy="30" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <circle cx="32" cy="62" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <circle cx="68" cy="62" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <circle cx="44" cy="54" r="2.6" fill="url(#discipline-gold-foil)" />
          <circle cx="50" cy="54" r="2.6" fill="url(#discipline-gold-foil)" />
          <circle cx="56" cy="54" r="2.6" fill="url(#discipline-gold-foil)" />
        </symbol>
        {/* Voice Roleplay — the same overlapping circles as Chat Roleplay
            (still an AI prospect's world meeting yours), with a small
            live-voice pulse instead of dots where they overlap, since this
            one is spoken, not typed. */}
        <symbol id="i-circles-voice" viewBox="0 0 100 100">
          <circle cx="50" cy="30" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <circle cx="32" cy="62" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <circle cx="68" cy="62" r="24" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3.5" />
          <rect x="45" y="50" width="3" height="10" rx="1.5" fill="url(#discipline-gold-foil)" />
          <rect x="50.5" y="44" width="3" height="16" rx="1.5" fill="url(#discipline-gold-foil)" />
          <rect x="56" y="50" width="3" height="10" rx="1.5" fill="url(#discipline-gold-foil)" />
        </symbol>
        {/* Mindset Shifting — a figure with concentric arcs rising above
            it: the soul expanding, not just the words you say. */}
        <symbol id="i-soul" viewBox="0 0 100 100">
          <circle cx="50" cy="34" r="9" />
          <path d="M50 43 C38 50 32 62 32 76 C32 86 40 92 50 92 C60 92 68 86 68 76 C68 62 62 50 50 43 Z" />
          <path
            d="M30 20 A28 28 0 0 1 70 20"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M20 12 A38 38 0 0 1 80 12"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.8"
          />
        </symbol>
        {/* Learning — an open book, restyled to the same outline-only
            weight as the crests above it; still an open book: anything
            worth studying. */}
        <symbol id="i-book" viewBox="0 0 100 100">
          <path
            d="M50 30 C38 24 24 22 14 24 V74 C24 72 38 74 50 80 C62 74 76 72 86 74 V24 C76 22 62 24 50 30 Z"
            fill="none"
            stroke="url(#discipline-gold-foil)"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path d="M50 30 V80" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="3" strokeLinecap="round" />
        </symbol>
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
