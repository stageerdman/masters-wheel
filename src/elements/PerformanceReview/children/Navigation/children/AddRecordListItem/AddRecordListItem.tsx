"use client";

import { open } from "@tauri-apps/plugin-dialog";
import position from "./AddRecordListItem.position.module.css";
import styles from "./AddRecordListItem.styles.module.css";

type AddRecordListItemProps = {
  onFilesPicked: (paths: string[]) => void;
};

// Same visual language as VideoListItem (one row, same height), but it's
// an action, not a record: "+" instead of a state glyph, no date, always
// pinned last — only meaningful inside this one list, so it lives nested
// here rather than flat under src/elements/.
export function AddRecordListItem({ onFilesPicked }: AddRecordListItemProps) {
  async function handleClick() {
    const selection = await open({ multiple: true });
    if (!selection) return;
    const paths = Array.isArray(selection) ? selection : [selection];
    if (paths.length > 0) onFilesPicked(paths);
  }

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root}`}
      data-construction
      onClick={handleClick}
    >
      <span className={`${styles.icon} ${position.icon}`} data-construction aria-hidden="true">
        +
      </span>
      <span className={position.textRows} data-construction>
        <span className={styles.title} data-construction>
          Add record
        </span>
      </span>
    </button>
  );
}
