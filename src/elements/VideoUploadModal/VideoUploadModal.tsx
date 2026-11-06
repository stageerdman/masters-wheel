"use client";

import { open } from "@tauri-apps/plugin-dialog";
import position from "./VideoUploadModal.position.module.css";
import styles from "./VideoUploadModal.styles.module.css";

type VideoUploadModalProps = {
  isOpen: boolean;
  isDragActive: boolean;
  onFileSelected: (path: string) => void;
  onClose: () => void;
  title?: string;
  dropZoneText?: string;
};

// A dedicated popup for uploading a record's hero video — only shown
// while that record has no hero file yet (see Hero.tsx's "Upload video"
// entry point). Same shape as TranscriptUploadModal, deliberately
// separate so a drop here never gets misread as "add a new video record"
// or "import a transcript" (see PerformanceReview.script.ts's drop hooks).
// `title`/`dropZoneText` default to Performance Review's own copy — Training
// Room reuses this element as-is for clip upload (video or audio) with its
// own wording instead of duplicating the whole modal.
export function VideoUploadModal({
  isOpen,
  isDragActive,
  onFileSelected,
  onClose,
  title = "Upload a video",
  dropZoneText = "Drag & drop your video file here",
}: VideoUploadModalProps) {
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
            {title}
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
            {dropZoneText}
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
