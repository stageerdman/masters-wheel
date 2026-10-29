"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";
import position from "./SpeakerContextMenu.position.module.css";
import styles from "./SpeakerContextMenu.styles.module.css";

type SpeakerContextMenuProps = {
  x: number;
  y: number;
  initialName: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

// A right-click-triggered rename popover, same discrete-commit idiom as
// the record title's click-to-edit (Enter commits, Escape/outside-click
// cancels) — not a multi-item context menu, since renaming is the only
// action a transcript line offers.
export function SpeakerContextMenu({ x, y, initialName, onSubmit, onClose }: SpeakerContextMenuProps) {
  const [value, setValue] = useState(initialName);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (value.trim()) onSubmit(value.trim());
      else onClose();
    } else if (event.key === "Escape") {
      onClose();
    }
  }

  function selectAll(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  return (
    <>
      <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose} />
      <div className={`${styles.root} ${position.root}`} data-construction style={{ left: x, top: y }}>
        <label className={`${styles.label} ${position.label}`} data-construction htmlFor="speaker-rename-input">
          Rename speaker
        </label>
        <input
          id="speaker-rename-input"
          className={`${styles.input} ${position.input}`}
          data-construction
          value={value}
          autoFocus
          onFocus={selectAll}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onClose}
        />
      </div>
    </>
  );
}
