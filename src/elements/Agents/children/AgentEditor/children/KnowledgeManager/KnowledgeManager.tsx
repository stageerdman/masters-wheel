"use client";

import { useRef } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { KnowledgeFile } from "@/elements/Agents/Agents.data";
import { contextPercent, fileKindLabel, filesToKnowledgeFiles, formatFileSize } from "./KnowledgeManager.script";
import position from "./KnowledgeManager.position.module.css";
import styles from "./KnowledgeManager.styles.module.css";

type KnowledgeManagerProps = {
  files: KnowledgeFile[];
  onAddFile: (file: KnowledgeFile) => void;
  onRemoveFile: (id: string) => void;
};

export function KnowledgeManager({ files, onAddFile, onRemoveFile }: KnowledgeManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const percent = contextPercent(files);

  function handleFilesPicked(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of filesToKnowledgeFiles(fileList)) {
      onAddFile(file);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFilesPicked(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFilesPicked(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction>
        Knowledge
      </span>
      <div className={position.meter} data-construction>
        <div
          className={`${styles.meterTrack} ${position.meterTrack}`}
          data-construction
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Context used"
        >
          <div className={`${styles.meterFill} ${position.meterFill}`} data-construction style={{ width: `${percent}%` }} />
        </div>
        <span className={`${styles.meterLabel} ${position.meterLabel}`} data-construction aria-live="polite">
          {percent >= 100 ? "Context full — large files may be truncated" : `${percent}% of context used`}
        </span>
      </div>
      {files.length === 0 ? (
        <div
          className={`${styles.dropZone} ${position.dropZone}`}
          data-construction
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
        >
          <span className={styles.dropZoneText} data-construction>
            Drag files here or click to add knowledge
          </span>
        </div>
      ) : (
        <div className={`${styles.fileList} ${position.fileList}`} data-construction onDrop={handleDrop} onDragOver={handleDragOver}>
          {files.map((file) => (
            <div key={file.id} className={`${styles.fileRow} ${position.fileRow}`} data-construction>
              <span className={`${styles.fileKind} ${position.fileKind}`} data-construction aria-hidden="true">
                {fileKindLabel(file.type).slice(0, 1)}
              </span>
              <span className={`${styles.fileName} ${position.fileName}`} data-construction title={file.name}>
                {file.name}
              </span>
              <span className={`${styles.fileMeta} ${position.fileMeta}`} data-construction>
                {formatFileSize(file.size)} · {fileKindLabel(file.type)}
              </span>
              <button
                type="button"
                className={`${styles.removeButton} ${position.removeButton}`}
                data-construction
                onClick={() => onRemoveFile(file.id)}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className={`${styles.addRow} ${position.addRow}`} data-construction onClick={() => inputRef.current?.click()}>
            + Add file
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        className={position.hiddenInput}
        data-construction
        onChange={handleInputChange}
        aria-label="Add knowledge files"
      />
    </div>
  );
}
