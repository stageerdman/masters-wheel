"use client";

import { useState } from "react";
import type { LearningBlock, TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { downloadLearningFile } from "@/lib/training";
import { LearningMediaItem } from "./children/LearningMediaItem/LearningMediaItem";
import position from "./LearningHero.position.module.css";
import styles from "./LearningHero.styles.module.css";

type LearningHeroProps = {
  session: TrainingSession;
  onNameChange: (name: string) => void;
  onOpenUpload: () => void;
  onUpdateBlockText: (blockId: string, content: string) => void;
  onTogglePin: () => void;
  onSelectFile: (fileId: string) => void;
  onRegisterMediaSeek: (fileId: string, seek: ((seconds: number) => void) | null) => void;
  onReportMediaTime: (fileId: string, seconds: number) => void;
};

// Learning's main column: one continuous document — every uploaded file
// renders as a real media item (or document chip) with a free-written
// text block underneath it, newest pair always on top (see
// TrainingRoom.data.ts's LearningBlock comment) — visually like inserting
// an image into a Word doc and writing notes right under it, repeatedly.
// The pin toggle keeps the topmost file's media fixed at the top of the
// column while everything else (older files + all text) scrolls
// independently underneath; off, the whole column scrolls as one feed.
export function LearningHero({
  session,
  onNameChange,
  onOpenUpload,
  onUpdateBlockText,
  onTogglePin,
  onSelectFile,
  onRegisterMediaSeek,
  onReportMediaTime,
}: LearningHeroProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Same "don't leave the title input open against a newly selected
  // session" guard Hero.tsx uses.
  const [renderedForId, setRenderedForId] = useState(session.id);
  if (session.id !== renderedForId) {
    setRenderedForId(session.id);
    setIsEditingTitle(false);
  }

  const learning = session.learning;
  if (!learning) return null;

  function fileFor(fileId: string) {
    return learning!.files.find((file) => file.id === fileId) ?? null;
  }

  function renderBlock(block: LearningBlock) {
    if (block.kind === "media") {
      const file = fileFor(block.fileId);
      if (!file) return null;
      return (
        <LearningMediaItem
          key={block.id}
          file={file}
          selected={learning!.selectedFileId === file.id}
          onSelect={() => onSelectFile(file.id)}
          onRegisterSeek={onRegisterMediaSeek}
          onReportTime={onReportMediaTime}
          onDownload={(target) => downloadLearningFile(session.id, target.storedFileName, target.fileName)}
        />
      );
    }
    return (
      <textarea
        key={block.id}
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={block.content}
        onChange={(event) => onUpdateBlockText(block.id, event.target.value)}
        placeholder="Notes"
      />
    );
  }

  const pinnedBlock = learning.pinTopMedia ? learning.blocks[0] : null;
  const scrollingBlocks = pinnedBlock ? learning.blocks.slice(1) : learning.blocks;

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.titleBlock} data-construction>
        {isEditingTitle ? (
          <input
            className={`${styles.titleInput} ${position.titleInput}`}
            data-construction
            value={session.name}
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
            }}
            aria-label="Session name"
          />
        ) : (
          <h1
            className={`${styles.title} ${position.title}`}
            data-construction
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
          >
            {session.name}
          </h1>
        )}
        {learning.files.length > 0 && (
          <button
            type="button"
            className={`${styles.pinButton} ${position.pinButton} ${learning.pinTopMedia ? styles.pinActive : ""}`}
            data-construction
            onClick={onTogglePin}
            title={learning.pinTopMedia ? "Unpin — scroll everything together" : "Pin the newest file to the top"}
            aria-pressed={learning.pinTopMedia}
          >
            📌
          </button>
        )}
      </div>
      {learning.files.length === 0 ? (
        <button
          type="button"
          className={`${styles.uploadButton} ${position.uploadButton}`}
          data-construction
          onClick={onOpenUpload}
        >
          Upload a file
        </button>
      ) : (
        <div className={`${styles.docSlot} ${position.docSlot}`} data-construction>
          {pinnedBlock && (
            <div className={position.pinnedSlot} data-construction>
              {renderBlock(pinnedBlock)}
            </div>
          )}
          <div className={position.scrollSlot} data-construction>
            <button
              type="button"
              className={`${styles.addFileButton} ${position.addFileButton}`}
              data-construction
              onClick={onOpenUpload}
            >
              + Add another file
            </button>
            {scrollingBlocks.map(renderBlock)}
          </div>
        </div>
      )}
    </section>
  );
}
