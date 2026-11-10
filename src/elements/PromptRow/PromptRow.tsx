"use client";

import position from "./PromptRow.position.module.css";
import styles from "./PromptRow.styles.module.css";

type PromptRowProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  placeholder?: string;
};

// A settings row for a single free-text prompt: collapsed shows just the
// setting's name; clicking it drops down a translucent panel with the
// editable textarea. Reusable beyond Settings' Profile category — any
// future "name + one big prompt" setting fits the same shape.
export function PromptRow({ label, value, onChange, isExpanded, onToggle, placeholder }: PromptRowProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.header} ${position.header}`}
        data-construction
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className={`${styles.label} ${position.label}`} data-construction>
          {label}
        </span>
      </button>
      {isExpanded && (
        <div className={`${styles.panel} ${position.panel}`} data-construction>
          <textarea
            className={`${styles.textarea} ${position.textarea}`}
            data-construction
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder={placeholder}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
