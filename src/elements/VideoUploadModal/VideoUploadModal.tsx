"use client";

import { open } from "@tauri-apps/plugin-dialog";
import position from "./VideoUploadModal.position.module.css";
import styles from "./VideoUploadModal.styles.module.css";

type VideoUploadModalProps = {
  isOpen: boolean;
  isDragActive: boolean;
  onFileSelected: (path: string) => void;
  onClose: () => void;
};

// A dedicated popup for uploading a record's hero video — only shown
// while that record has no hero file yet (see Hero.tsx's "Upload video"
// entry point). Same shape as TranscriptUploadModal, deliberately
// separate so a drop here never gets misread as "add a new video record"
// or "import a transcript" (see PerformanceReview.script.ts's drop hooks).
export function VideoUploadModal({ isOpen, isDragActive, onFileSelected, onClose }: VideoUploadModalProps) {
  if (!isOpen) return null;

  async function handleBrowse() {
    const selection = await open({ multiple: false });
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
            Upload a video
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
            Drag & drop your video file here
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
      </div>
    </div>
  );
}
