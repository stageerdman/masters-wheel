"use client";

import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import position from "./TranscriptUploadModal.position.module.css";
import styles from "./TranscriptUploadModal.styles.module.css";

type TranscriptUploadModalProps = {
  isOpen: boolean;
  isDragActive: boolean;
  error: string | null;
  onFileSelected: (path: string) => void;
  onTextSubmitted: (text: string) => void;
  onClose: () => void;
};

type Mode = "file" | "paste";

// A dedicated popup for importing a transcript — either a dropped/picked
// file or text pasted straight in (e.g. Fathom's "Copy transcript").
// Deliberately separate from each page's own whole-window media drop (see
// PerformanceReview.script.ts's useTranscriptDrop/useRecordDrop split) so
// a drop here never gets misread as "add a new video", and a video
// dropped elsewhere never lands here either. Format conversion (Fathom →
// our canonical shape) happens in the caller via src/lib/transcript, so
// both modes go through the exact same parse.
export function TranscriptUploadModal({
  isOpen,
  isDragActive,
  error,
  onFileSelected,
  onTextSubmitted,
  onClose,
}: TranscriptUploadModalProps) {
  const [mode, setMode] = useState<Mode>("file");
  const [pasted, setPasted] = useState("");

  // Start fresh every time the popup reopens — the parent closes it on a
  // successful import without going through handleClose below.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setPasted("");
      setMode("file");
    }
  }

  if (!isOpen) return null;

  async function handleBrowse() {
    const selection = await open({
      multiple: false,
      filters: [{ name: "Transcript", extensions: ["md", "txt"] }],
    });
    if (typeof selection === "string") onFileSelected(selection);
  }

  function handleClose() {
    onClose();
  }

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={handleClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        role="dialog"
        aria-modal="true"
        aria-label="Upload a transcript"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") handleClose();
        }}
      >
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Upload a transcript
          </h2>
          <button
            type="button"
            className={`${styles.closeButton} ${position.closeButton}`}
            data-construction
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={`${styles.modeSwitch} ${position.modeSwitch}`} data-construction role="tablist">
          {(["file", "paste"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={`${styles.modeButton} ${position.modeButton} ${mode === value ? styles.modeButtonActive : ""}`}
              data-construction
              onClick={() => setMode(value)}
            >
              {value === "file" ? "Drop a file" : "Paste text"}
            </button>
          ))}
        </div>
        {mode === "file" ? (
          <div
            className={`${styles.dropZone} ${position.dropZone} ${isDragActive ? styles.dropZoneActive : ""}`}
            data-construction
          >
            <p className={`${styles.dropZoneText} ${position.dropZoneText}`} data-construction>
              Drag & drop your transcript file here
            </p>
            <p className={`${styles.orText} ${position.orText}`} data-construction>
              or
            </p>
            <button
              type="button"
              className={`${styles.browseButton} ${position.browseButton}`}
              data-construction
              onClick={handleBrowse}
            >
              Browse files
            </button>
          </div>
        ) : (
          <div className={position.pastePanel} data-construction>
            <textarea
              className={`${styles.pasteInput} ${position.pasteInput}`}
              data-construction
              value={pasted}
              autoFocus
              onChange={(event) => setPasted(event.target.value)}
              placeholder={"0:00 - Speaker Name\n  What they said…"}
              aria-label="Transcript text"
            />
            <button
              type="button"
              className={`${styles.browseButton} ${position.browseButton}`}
              data-construction
              disabled={pasted.trim() === ""}
              onClick={() => onTextSubmitted(pasted)}
            >
              Import
            </button>
          </div>
        )}
        <p className={`${styles.orText} ${position.hint}`} data-construction>
          Fathom transcripts are converted automatically.
        </p>
        {error && (
          <p className={`${styles.error} ${position.error}`} data-construction>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
