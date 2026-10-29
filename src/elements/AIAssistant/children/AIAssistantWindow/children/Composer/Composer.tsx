"use client";

import type { KeyboardEvent } from "react";
import position from "./Composer.position.module.css";
import styles from "./Composer.styles.module.css";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  density: "compact" | "comfortable";
};

export function Composer({ value, onChange, onSend, density }: ComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  const densityClass = density === "comfortable" ? position.comfortable : "";

  return (
    <div className={`${styles.root} ${position.root} ${densityClass}`} data-construction>
      <textarea
        className={`${styles.input} ${position.input}`}
        data-construction
        rows={1}
        value={value}
        placeholder="Message the assistant"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className={`${styles.send} ${position.send}`}
        data-construction
        onClick={onSend}
        disabled={value.trim().length === 0}
        aria-label="Send message"
      >
        <svg className={styles.sendGlyph} data-construction viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M8 2 L8 13 M3 7 L8 2 L13 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
