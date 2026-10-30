"use client";

import type { KnowledgeFile } from "@/elements/Agents/Agents.data";
import { useWindowFileDrop } from "@/lib/useWindowFileDrop";
import { fileKindLabel, formatFileSize, useKnowledgeUpload } from "./KnowledgeManager.script";
import position from "./KnowledgeManager.position.module.css";
import styles from "./KnowledgeManager.styles.module.css";

type KnowledgeManagerProps = {
  agentId: string;
  files: KnowledgeFile[];
  onAddFile: (file: KnowledgeFile) => void;
  onRemoveFile: (id: string) => void;
};

function indexingLabel(indexing: { fileName: string; processed: number; total: number }) {
  if (indexing.total === 0) return `Reading ${indexing.fileName}…`;
  return `Indexing ${indexing.fileName}… ${indexing.processed}/${indexing.total} chunks`;
}

export function KnowledgeManager({ agentId, files, onAddFile, onRemoveFile }: KnowledgeManagerProps) {
  const { indexing, error, addFiles, pickAndAddFiles } = useKnowledgeUpload(agentId, onAddFile);
  const isDragActive = useWindowFileDrop(true, addFiles);
  const totalChunks = files.reduce((sum, file) => sum + file.chunkCount, 0);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction>
        Knowledge
      </span>
      {files.length > 0 && (
        <span className={`${styles.summary} ${position.summary}`} data-construction>
          {totalChunks.toLocaleString()} chunk{totalChunks === 1 ? "" : "s"} indexed — the agent answers from this directly, it isn&apos;t just stuffed into context
        </span>
      )}
      {files.length === 0 ? (
        <button
          type="button"
          className={`${styles.dropZone} ${position.dropZone} ${isDragActive ? styles.dropZoneActive : ""}`}
          data-construction
          onClick={pickAndAddFiles}
          disabled={indexing !== null}
        >
          <span className={styles.dropZoneText} data-construction>
            {indexing ? indexingLabel(indexing) : "Drag files here, or click to add knowledge (.txt, .md, .pdf)"}
          </span>
        </button>
      ) : (
        <div
          className={`${styles.fileList} ${position.fileList} ${isDragActive ? styles.fileListActive : ""}`}
          data-construction
        >
          {files.map((file) => (
            <div key={file.id} className={`${styles.fileRow} ${position.fileRow}`} data-construction>
              <span className={`${styles.fileKind} ${position.fileKind}`} data-construction aria-hidden="true">
                {fileKindLabel(file.type).slice(0, 1)}
              </span>
              <span className={`${styles.fileName} ${position.fileName}`} data-construction title={file.name}>
                {file.name}
              </span>
              <span className={`${styles.fileMeta} ${position.fileMeta}`} data-construction>
                {formatFileSize(file.size)} · {file.chunkCount.toLocaleString()} chunk{file.chunkCount === 1 ? "" : "s"}
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
          <button
            type="button"
            className={`${styles.addRow} ${position.addRow}`}
            data-construction
            onClick={pickAndAddFiles}
            disabled={indexing !== null}
          >
            {indexing ? indexingLabel(indexing) : "+ Add file (or drag one in)"}
          </button>
        </div>
      )}
      {error && (
        <span className={`${styles.error} ${position.error}`} data-construction role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
