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
  voiceTraining: "#i-raven",
  chatRoleplay: "#i-quill",
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
        {/* Voice Training — a raven in flight, wings spread: your voice carried back to you. */}
        <symbol id="i-raven" viewBox="0 0 100 100">
          <path d="M50 18 Q58 40 50 88 Q42 40 50 18 Z" />
          <path d="M50 38 Q18 20 4 46 Q26 42 48 52 Z" />
          <path d="M50 38 Q82 20 96 46 Q74 42 52 52 Z" />
          <path d="M50 74 L38 94 L50 86 L62 94 Z" />
        </symbol>
        {/* Chat Roleplay — a quill: a typed conversation. */}
        <symbol id="i-quill" viewBox="0 0 100 100">
          <path d="M70 6 C40 10 18 34 14 70 C13 78 16 88 22 92 C26 94 30 92 32 86 C36 70 48 48 70 30 C82 20 90 10 70 6 Z" />
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
