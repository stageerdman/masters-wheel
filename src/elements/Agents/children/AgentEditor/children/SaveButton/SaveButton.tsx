"use client";

import { useState } from "react";
import { useSavedConfirmation } from "./SaveButton.script";
import position from "./SaveButton.position.module.css";
import styles from "./SaveButton.styles.module.css";

type SaveButtonProps = {
  dirty: boolean;
  onSave: () => void;
};

export function SaveButton({ dirty, onSave }: SaveButtonProps) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Derived during render, not synced via an effect: a fresh edit landing
  // while "Saved" is showing makes this false on its own as soon as
  // `dirty` flips true — no setState needed to "abort" the confirmation.
  const confirming = savedAt !== null && !dirty;
  const visible = dirty || confirming;

  useSavedConfirmation(savedAt, setSavedAt);

  function handleClick() {
    onSave();
    setSavedAt(Date.now());
  }

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${visible ? styles.visible : ""}`}
      data-construction
      onClick={handleClick}
      disabled={!dirty && !confirming}
    >
      {confirming ? "Saved" : "Save"}
    </button>
  );
}
