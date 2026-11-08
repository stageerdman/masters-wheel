"use client";

import { useState } from "react";
import type { ProposalCardData } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";
import position from "./ProposalCard.position.module.css";
import styles from "./ProposalCard.styles.module.css";

type ProposalCardProps = {
  card: ProposalCardData;
  editingRowId: string | null;
  isAddingRow: boolean;
  isBeginning: boolean;
  onToggleRow: (rowId: string) => void;
  onStartEdit: (rowId: string) => void;
  onCommitEdit: (rowId: string, value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onStartAdd: () => void;
  onCommitAdd: (value: string) => void;
  onBegin: () => void;
};

// The setup phase's one specialized component (everything else in
// SetupThread is a plain chat bubble) — a bordered "decision" card is the
// one visual signal the user asked to keep legible: bordered chrome means
// a decision point, a bare bubble means just talk. Frozen cards (either
// superseded by a refinement, or the one that was actually accepted) stay
// in scrollback permanently rather than being deleted — see the wiki.
export function ProposalCard({
  card,
  editingRowId,
  isAddingRow,
  isBeginning,
  onToggleRow,
  onStartEdit,
  onCommitEdit,
  onDeleteRow,
  onStartAdd,
  onCommitAdd,
  onBegin,
}: ProposalCardProps) {
  const [draftValue, setDraftValue] = useState("");
  const [newRowValue, setNewRowValue] = useState("");

  return (
    <div className={`${styles.root} ${position.root} ${card.frozen ? styles.frozen : ""}`} data-construction>
      <div className={position.head} data-construction>
        <span className={`${styles.dot} ${position.dot}`} data-construction />
        <span className={`${styles.microLabel} ${position.microLabel}`} data-construction>
          Training Plan
        </span>
        <span className={`${styles.title} ${position.title}`} data-construction>
          {card.title}
        </span>
        {card.frozen && card.superseded && (
          <span className={`${styles.superseded} ${position.superseded}`} data-construction>
            Superseded below
          </span>
        )}
      </div>
      <p className={`${styles.objective} ${position.objective}`} data-construction>
        {card.objective}
      </p>
      <p className={`${styles.meta} ${position.meta}`} data-construction>
        {`Difficulty: ${card.difficulty.charAt(0).toUpperCase()}${card.difficulty.slice(1)}${card.meta ? ` · ${card.meta}` : ""}`}
      </p>
      <div className={position.assumptions} data-construction>
        {card.assumptions.map((row) => (
          <div
            key={row.id}
            className={`${position.row} ${row.checked ? "" : styles.rowRejected}`}
            data-construction
          >
            {card.frozen ? (
              <span className={`${styles.check} ${position.check}`} data-construction aria-hidden="true" />
            ) : (
              <button
                type="button"
                className={`${styles.check} ${position.check}`}
                data-construction
                aria-pressed={row.checked}
                aria-label={row.checked ? "Reject this assumption" : "Accept this assumption"}
                onClick={() => onToggleRow(row.id)}
              />
            )}
            {editingRowId === row.id ? (
              <input
                type="text"
                className={`${styles.textInput} ${position.textInput}`}
                data-construction
                autoFocus
                defaultValue={row.text}
                onChange={(event) => setDraftValue(event.target.value)}
                onBlur={() => onCommitEdit(row.id, draftValue || row.text)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") onCommitEdit(row.id, row.text);
                }}
              />
            ) : (
              <span
                className={`${styles.text} ${position.text}`}
                data-construction
                onClick={card.frozen ? undefined : () => onStartEdit(row.id)}
              >
                {row.text}
              </span>
            )}
            {!card.frozen && (
              <button
                type="button"
                className={`${styles.delete} ${position.delete}`}
                data-construction
                aria-label="Delete this assumption"
                onClick={() => onDeleteRow(row.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!card.frozen &&
        (isAddingRow ? (
          <input
            type="text"
            className={`${styles.addInput} ${position.addInput}`}
            data-construction
            autoFocus
            placeholder="New assumption…"
            value={newRowValue}
            onChange={(event) => setNewRowValue(event.target.value)}
            onBlur={() => {
              onCommitAdd(newRowValue);
              setNewRowValue("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : (
          <button type="button" className={`${styles.addRow} ${position.addRow}`} data-construction onClick={onStartAdd}>
            + Add assumption
          </button>
        ))}
      {!card.frozen && (
        <div className={position.foot} data-construction>
          <button
            type="button"
            className={`${styles.begin} ${position.begin}`}
            data-construction
            disabled={isBeginning}
            onClick={onBegin}
          >
            {isBeginning ? "Beginning…" : "Begin Roleplay"}
          </button>
        </div>
      )}
    </div>
  );
}
