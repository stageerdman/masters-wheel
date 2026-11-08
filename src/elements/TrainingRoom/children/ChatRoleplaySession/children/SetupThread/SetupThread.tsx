"use client";

import { useEffect, useRef, useState } from "react";
import type { SetupBlock } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";
import { ProposalCard } from "./children/ProposalCard/ProposalCard";
import position from "./SetupThread.position.module.css";
import styles from "./SetupThread.styles.module.css";

type SetupThreadProps = {
  thread: SetupBlock[];
  editingAssumptionRowId: string | null;
  isAddingAssumptionRow: boolean;
  isBeginning: boolean;
  isSending: boolean;
  onSubmitMessage: (text: string) => void;
  onToggleRow: (cardId: string, rowId: string) => void;
  onStartEdit: (rowId: string) => void;
  onCommitEdit: (cardId: string, rowId: string, value: string) => void;
  onDeleteRow: (cardId: string, rowId: string) => void;
  onStartAdd: () => void;
  onCommitAdd: (cardId: string, value: string) => void;
  onBegin: (cardId: string) => void;
};

// Before a scenario is confirmed, the whole screen is just this: a plain
// chat with one specialized component embedded in it (ProposalCard). The
// sticky "Not set up yet" strip is the one thing the user explicitly
// asked for here — an unmistakable signal that this isn't a live
// roleplay yet, distinct from everything that follows confirmation.
export function SetupThread({
  thread,
  editingAssumptionRowId,
  isAddingAssumptionRow,
  isBeginning,
  isSending,
  onSubmitMessage,
  onToggleRow,
  onStartEdit,
  onCommitEdit,
  onDeleteRow,
  onStartAdd,
  onCommitAdd,
  onBegin,
}: SetupThreadProps) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [thread]);

  function handleSend() {
    if (!value.trim() || isSending) return;
    onSubmitMessage(value);
    setValue("");
  }

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={`${styles.stickyStrip} ${position.stickyStrip}`} data-construction>
        <span className={`${styles.dot} ${position.dot}`} data-construction />
        Not set up yet — tell the AI what you want to train
      </div>
      <div ref={listRef} className={`${styles.list} ${position.list}`} data-construction>
        {thread.map((block) => {
          if (block.kind === "text") {
            return (
              <div key={block.id} className={`${position.row} ${block.role === "user" ? position.rowUser : ""}`} data-construction>
                <div className={`${styles.bubble} ${position.bubble} ${block.role === "user" ? styles.bubbleUser : ""}`} data-construction>
                  {block.text.split("\n").map((line, index) => (
                    <span key={index} className={position.line} data-construction>
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
          if (block.kind === "divider") {
            return (
              <div key={block.id} className={`${styles.divider} ${position.divider}`} data-construction>
                <span>{block.label}</span>
              </div>
            );
          }
          return (
            <ProposalCard
              key={block.id}
              card={block.card}
              editingRowId={editingAssumptionRowId}
              isAddingRow={isAddingAssumptionRow}
              isBeginning={isBeginning}
              onToggleRow={(rowId) => onToggleRow(block.card.id, rowId)}
              onStartEdit={onStartEdit}
              onCommitEdit={(rowId, newValue) => onCommitEdit(block.card.id, rowId, newValue)}
              onDeleteRow={(rowId) => onDeleteRow(block.card.id, rowId)}
              onStartAdd={onStartAdd}
              onCommitAdd={(newValue) => onCommitAdd(block.card.id, newValue)}
              onBegin={() => onBegin(block.card.id)}
            />
          );
        })}
      </div>
      <div className={`${styles.composer} ${position.composer}`} data-construction>
        <input
          type="text"
          className={`${styles.input} ${position.input}`}
          data-construction
          placeholder="Message…"
          value={value}
          disabled={isSending}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
        />
        <button
          type="button"
          className={`${styles.send} ${position.send}`}
          data-construction
          onClick={handleSend}
          disabled={value.trim().length === 0 || isSending}
          aria-label="Send"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M8 2 L8 13 M3 7 L8 2 L13 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
