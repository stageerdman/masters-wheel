"use client";

import { useState } from "react";
import type { Space } from "@/lib/spaces";
import position from "./DeleteSpaceModal.position.module.css";
import styles from "./DeleteSpaceModal.styles.module.css";

type DeleteSpaceModalProps = {
  space: Space;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const CONFIRM_WORD = "delete";

// Irreversible — the whole Space's folder (its Agents, chat history, and
// Performance Review records, all of it) is gone. Typing the word itself
// is a much higher bar than a plain Yes/No click, deliberately: this is
// the one action in the app that can lose an entire Space's worth of data
// in one go, more than Performance Review's "Remove record" ever risks.
export function DeleteSpaceModal({ space, onClose, onConfirm }: DeleteSpaceModalProps) {
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = typed.trim().toLowerCase() === CONFIRM_WORD && !isDeleting;

  async function handleDelete() {
    if (!canDelete) return;
    setIsDeleting(true);
    await onConfirm();
  }

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div className={`${styles.root} ${position.root}`} data-construction onClick={(event) => event.stopPropagation()}>
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Delete &ldquo;{space.name}&rdquo;?
          </h2>
          <button type="button" className={`${styles.closeButton} ${position.closeButton}`} data-construction onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className={`${styles.warning} ${position.warning}`} data-construction>
          This permanently deletes every Agent, chat, and Performance Review record in this Space. This can&apos;t be undone.
        </p>

        <label className={`${styles.label} ${position.label}`} data-construction htmlFor="delete-space-confirm">
          Type &ldquo;{CONFIRM_WORD}&rdquo; to confirm
        </label>
        <input
          id="delete-space-confirm"
          type="text"
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleDelete();
          }}
          className={`${styles.input} ${position.input}`}
          data-construction
        />

        <div className={position.actions} data-construction>
          <button type="button" className={`${styles.cancelButton} ${position.cancelButton}`} data-construction onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            className={`${styles.deleteButton} ${position.deleteButton}`}
            data-construction
            onClick={handleDelete}
          >
            Delete Space
          </button>
        </div>
      </div>
    </div>
  );
}
