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
  voiceTraining: "#i-speaker",
  chatRoleplay: "#i-chat",
  voiceRoleplay: "#i-mask",
  mindsetShifting: "#i-eye",
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
          <mask id="discipline-mask-chat" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#fff" />
            <circle cx="34" cy="43" r="5" fill="#000" />
            <circle cx="50" cy="43" r="5" fill="#000" />
            <circle cx="66" cy="43" r="5" fill="#000" />
          </mask>
          <mask id="discipline-mask-face" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#fff" />
            <ellipse cx="36" cy="46" rx="8" ry="10" transform="rotate(-10 36 46)" fill="#000" />
            <ellipse cx="64" cy="46" rx="8" ry="10" transform="rotate(10 64 46)" fill="#000" />
            <ellipse cx="50" cy="74" rx="14" ry="5" fill="#000" />
          </mask>
          <mask id="discipline-mask-eye" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#fff" />
            <circle cx="50" cy="50" r="14" fill="#000" />
          </mask>
        </defs>
        {/* Voice Training — a speaker with soundwaves: your voice carried back to you. */}
        <symbol id="i-speaker" viewBox="0 0 100 100">
          <path d="M30 38 L30 62 L45 62 L63 77 L63 23 L45 38 Z" />
          <path d="M70 40 A15 15 0 0 1 70 60" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="6" strokeLinecap="round" />
          <path d="M78 31 A28 28 0 0 1 78 69" fill="none" stroke="url(#discipline-gold-foil)" strokeWidth="6" strokeLinecap="round" />
        </symbol>
        {/* Chat Roleplay — a speech bubble: a typed conversation. */}
        <symbol id="i-chat" viewBox="0 0 100 100">
          <path
            mask="url(#discipline-mask-chat)"
            d="M12 20 H88 a8 8 0 0 1 8 8 V62 a8 8 0 0 1 -8 8 H40 L18 88 V70 H12 a8 8 0 0 1 -8 -8 V28 a8 8 0 0 1 8 -8 Z"
          />
        </symbol>
        {/* Voice Roleplay — a drama mask: playing a role out loud. */}
        <symbol id="i-mask" viewBox="0 0 100 100">
          <path
            mask="url(#discipline-mask-face)"
            d="M50 14 C24 14 14 32 14 52 C14 76 30 92 50 92 C70 92 86 76 86 52 C86 32 76 14 50 14 Z"
          />
        </symbol>
        {/* Mindset Shifting — an open eye: reframing how you see it. */}
        <symbol id="i-eye" viewBox="0 0 100 100">
          <path mask="url(#discipline-mask-eye)" d="M8 50 C26 20 74 20 92 50 C74 80 26 80 8 50 Z" />
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
