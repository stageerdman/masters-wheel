"use client";

import { useRef, type KeyboardEvent } from "react";
import type { StorageMode } from "@/lib/onedrive";
import position from "./ModePicker.position.module.css";
import styles from "./ModePicker.styles.module.css";

type ModePickerProps = {
  mode: StorageMode;
  onPick: (mode: StorageMode) => void;
};

const OPTIONS: { mode: StorageMode; name: string; tag?: string; line: string; hint: string }[] = [
  {
    mode: "backup",
    name: "Backup",
    tag: "Recommended",
    line: "Every video stays on this Mac, and a copy is kept safe in OneDrive.",
    hint: "For peace of mind. Doesn't free up space.",
  },
  {
    mode: "smart",
    name: "Smart",
    line: "Videos added or watched in the last 14 days stay on this Mac. Older ones live in OneDrive and play from there.",
    hint: "Frees space and keeps recent calls ready offline.",
  },
  {
    mode: "alwaysInCloud",
    name: "Always in cloud",
    line: "Videos live in OneDrive and play from there. This Mac keeps a copy only until it's safe.",
    hint: "Frees the most space. Needs internet to play.",
  },
];

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

// "Keep videos" (SPEC 5.4): three large radio rows. Picking one asks the
// panel, which applies it or opens the switch confirm.
export function ModePicker({ mode, onPick }: ModePickerProps) {
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const step = STEP[event.key];
    if (step === undefined) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onPick(OPTIONS[index].mode);
      }
      return;
    }
    event.preventDefault();
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    rows.current[next]?.focus();
    onPick(OPTIONS[next].mode);
  }

  return (
    <div className={position.root} data-construction>
      <h3 id="storage-keep-videos" className={`${styles.heading} ${position.heading}`} data-construction>
        Keep videos
      </h3>
      <div role="radiogroup" aria-labelledby="storage-keep-videos" className={position.group} data-construction>
        {OPTIONS.map((option, index) => {
          const checked = option.mode === mode;
          return (
            <div
              key={option.mode}
              ref={(el) => {
                rows.current[index] = el;
              }}
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={`${styles.row} ${checked ? styles.rowChecked : ""} ${position.row}`}
              data-construction
              onClick={() => onPick(option.mode)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className={`${styles.radio} ${checked ? styles.radioChecked : ""} ${position.radio}`} data-construction aria-hidden />
              <span className={position.texts} data-construction>
                <span className={`${styles.name} ${position.name}`} data-construction>
                  {option.name}
                  {option.tag && <span className={`${styles.tag} ${position.tag}`} data-construction>{option.tag}</span>}
                </span>
                <span className={styles.line} data-construction>{option.line}</span>
                <span className={styles.hint} data-construction>{option.hint}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
