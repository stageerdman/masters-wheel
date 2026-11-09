"use client";

import { useEffect, useRef } from "react";
import type { LearningFile } from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./LearningMediaItem.position.module.css";
import styles from "./LearningMediaItem.styles.module.css";

type LearningMediaItemProps = {
  file: LearningFile;
  selected: boolean;
  onSelect: () => void;
  onRegisterSeek: (fileId: string, seek: ((seconds: number) => void) | null) => void;
  onReportTime: (fileId: string, seconds: number) => void;
  onDownload: (file: LearningFile) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// One block's media half — a real video/audio player (registers its own
// seek handler so LearningDetail's transcript, in the other column, can
// drive this element's playback) or, for a pdf/epub, a plain file chip:
// icon + name + size + Download, never played back or opened in-app (see
// TrainingRoom.data.ts's LearningFileKind comment).
export function LearningMediaItem({ file, selected, onSelect, onRegisterSeek, onReportTime, onDownload }: LearningMediaItemProps) {
  const mediaRef = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    if (file.kind === "document") return;
    function seek(seconds: number) {
      const el = mediaRef.current;
      if (!el) return;
      el.currentTime = seconds;
      el.play();
    }
    onRegisterSeek(file.id, seek);
    return () => onRegisterSeek(file.id, null);
  }, [file.id, file.kind, onRegisterSeek]);

  if (file.kind === "document") {
    return (
      <article className={`${styles.root} ${position.root} ${styles.documentRoot}`} data-construction>
        <button
          type="button"
          className={`${styles.documentChip} ${position.documentChip} ${selected ? styles.selected : ""}`}
          data-construction
          onClick={onSelect}
        >
          <span className={`${styles.documentIcon} ${position.documentIcon}`} data-construction aria-hidden="true">
            {file.extension.toUpperCase() || "FILE"}
          </span>
          <span className={position.documentInfo} data-construction>
            <span className={`${styles.documentName} ${position.documentName}`} data-construction>
              {file.fileName}
            </span>
            <span className={`${styles.documentMeta} ${position.documentMeta}`} data-construction>
              {formatBytes(file.sizeBytes)}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={`${styles.downloadButton} ${position.downloadButton}`}
          data-construction
          onClick={() => onDownload(file)}
        >
          Download
        </button>
      </article>
    );
  }

  return (
    <article
      className={`${styles.root} ${position.root} ${selected ? styles.selected : ""}`}
      data-construction
      onClick={onSelect}
    >
      {file.kind === "video" ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className={`${styles.media} ${position.media}`}
          data-construction
          src={file.src}
          controls
          onTimeUpdate={(event) => onReportTime(file.id, event.currentTarget.currentTime)}
          aria-label={file.fileName}
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          className={`${styles.media} ${position.media}`}
          data-construction
          src={file.src}
          controls
          onTimeUpdate={(event) => onReportTime(file.id, event.currentTarget.currentTime)}
          aria-label={file.fileName}
        />
      )}
      <p className={`${styles.fileName} ${position.fileName}`} data-construction>
        {file.fileName}
      </p>
    </article>
  );
}
