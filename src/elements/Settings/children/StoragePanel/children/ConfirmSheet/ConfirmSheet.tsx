"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Sheet } from "@/lib/onedrive";
import position from "./ConfirmSheet.position.module.css";
import styles from "./ConfirmSheet.styles.module.css";

type ConfirmSheetProps = {
  sheet: Sheet;
  onConfirm: () => void;
  onCancel: () => void;
};

// The storage confirms (SPEC 5.5, 5.7). Cancel has focus, Escape cancels,
// Tab stays inside, and focus goes back to whatever opened it.
export function ConfirmSheet({ sheet, onConfirm, onCancel }: ConfirmSheetProps) {
  const root = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => opener?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = (at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }

  const confirmButton = (
    <button
      type="button"
      className={`${sheet.confirmIsQuiet ? styles.quiet : styles.primary} ${position.button}`}
      data-construction
      disabled={!sheet.canConfirm}
      onClick={onConfirm}
    >
      {sheet.confirmLabel}
    </button>
  );
  const cancelButton = (
    <button ref={cancel} type="button" className={`${styles.secondary} ${position.button}`} data-construction onClick={onCancel}>
      Cancel
    </button>
  );

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onCancel}>
      <div
        ref={root}
        className={`${styles.root} ${position.root}`}
        data-construction
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="storage-sheet-title"
        aria-describedby="storage-sheet-body"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 id="storage-sheet-title" className={`${styles.title} ${position.text}`} data-construction>
          {sheet.title}
        </h2>
        <p id="storage-sheet-body" className={`${styles.body} ${position.text}`} data-construction>
          {sheet.body}
          {sheet.offlineLine && ` ${sheet.offlineLine}`}
        </p>
        <div className={position.actions} data-construction>
          {sheet.confirmIsQuiet ? (
            <>
              {cancelButton}
              {confirmButton}
            </>
          ) : (
            <>
              {confirmButton}
              {cancelButton}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
