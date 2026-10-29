"use client";

import { open } from "@tauri-apps/plugin-dialog";
import position from "./TranscriptUploadModal.position.module.css";
import styles from "./TranscriptUploadModal.styles.module.css";

type TranscriptUploadModalProps = {
  isOpen: boolean;
  isDragActive: boolean;
  error: string | null;
  onFileSelected: (path: string) => void;
  onClose: () => void;
};

// A dedicated popup for importing a transcript file — deliberately
// separate from the page's existing whole-window video drag-and-drop (see
// PerformanceReview.script.ts's useTranscriptDrop/useRecordDrop split) so
// a drop here never gets misread as "add a new video record", and a video
// dropped elsewhere never lands here either.
export function TranscriptUploadModal({
  isOpen,
  isDragActive,
  error,
  onFileSelected,
  onClose,
}: TranscriptUploadModalProps) {
  if (!isOpen) return null;

  async function handleBrowse() {
    const selection = await open({
      multiple: false,
      filters: [{ name: "Transcript", extensions: ["md", "txt"] }],
    });
    if (typeof selection === "string") onFileSelected(selection);
  }

  return (
    <div className={`${styles.backdrop} ${position.backdrop}`} data-construction onClick={onClose}>
      <div
        className={`${styles.root} ${position.root}`}
        data-construction
        onClick={(event) => event.stopPropagation()}
      >
        <div className={position.header} data-construction>
          <h2 className={`${styles.title} ${position.title}`} data-construction>
            Upload a transcript
          </h2>
          <button
            type="button"
            className={`${styles.closeButton} ${position.closeButton}`}
            data-construction
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
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
        {error && (
          <p className={`${styles.error} ${position.error}`} data-construction>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
