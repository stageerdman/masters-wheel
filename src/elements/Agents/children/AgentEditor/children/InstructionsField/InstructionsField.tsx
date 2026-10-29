"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useMentionPicker } from "@/lib/useMentionPicker";
import type { KnowledgeFile } from "@/elements/Agents/Agents.data";
import { matchFileMention, splitFileMentions } from "./InstructionsField.script";
import position from "./InstructionsField.position.module.css";
import styles from "./InstructionsField.styles.module.css";

type InstructionsFieldProps = {
  value: string;
  knowledgeFiles: KnowledgeFile[];
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
};

export function InstructionsField({ value, knowledgeFiles, onChange, onFocus, onBlur }: InstructionsFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { textareaRef, isOpen, matches, activeIndex, mentionQuery, selectItem, handleChange, handleKeyDown } =
    useMentionPicker(value, onChange, knowledgeFiles, matchFileMention);

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    handleKeyDown(event);
  }

  const showNoFilesHint = mentionQuery !== null && knowledgeFiles.length === 0;
  const parts = splitFileMentions(value, knowledgeFiles);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <label className={`${styles.label} ${position.label}`} data-construction htmlFor="agent-instructions">
        Instructions
      </label>
      <div className={position.fieldWrap} data-construction>
        {isEditing ? (
          <>
            {isOpen && (
              <div className={`${styles.mentionMenu} ${position.mentionMenu}`} data-construction role="listbox">
                {matches.map((file, index) => (
                  <button
                    key={file.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`${styles.mentionItem} ${position.mentionItem} ${
                      index === activeIndex ? styles.mentionItemActive : ""
                    }`}
                    data-construction
                    onClick={() => selectItem(file)}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            )}
            {showNoFilesHint && (
              <div className={`${styles.hint} ${position.hint}`} data-construction>
                No knowledge files yet — add one below
              </div>
            )}
            <textarea
              id="agent-instructions"
              ref={textareaRef}
              className={`${styles.textarea} ${position.textarea}`}
              data-construction
              value={value}
              placeholder="Describe how this agent should think and respond. Type @ to pull in one of its knowledge files."
              onChange={handleChange}
              onKeyDown={handleTextareaKeyDown}
              onFocus={onFocus}
              onBlur={() => {
                setIsEditing(false);
                onBlur();
              }}
            />
          </>
        ) : (
          <div
            className={`${styles.rendered} ${position.rendered}`}
            data-construction
            tabIndex={0}
            role="textbox"
            aria-label="Instructions"
            onFocus={() => setIsEditing(true)}
            onClick={() => setIsEditing(true)}
          >
            {value.length === 0 ? (
              <span className={styles.placeholder} data-construction>
                Describe how this agent should think and respond. Type @ to pull in one of its knowledge files.
              </span>
            ) : (
              parts.map((part, index) =>
                part.file ? (
                  <span key={index} className={`${styles.mention} ${position.mention}`} data-construction>
                    {part.text}
                  </span>
                ) : (
                  part.text
                ),
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
