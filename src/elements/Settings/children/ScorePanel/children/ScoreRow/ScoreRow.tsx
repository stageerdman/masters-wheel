"use client";

import type { ScorecardCriterionDef } from "@/lib/settings";
import position from "./ScoreRow.position.module.css";
import styles from "./ScoreRow.styles.module.css";

type ScoreRowProps = {
  ordinal: number;
  criterion: ScorecardCriterionDef;
  isExpanded: boolean;
  onToggle: () => void;
  onNameChange: (name: string) => void;
  onPromptChange: (prompt: string) => void;
  onDelete: () => void;
  canDelete: boolean;
};

// One scoring criterion: "Score N" + an inline-editable name on the left;
// clicking the row (not the name input) drops down a translucent panel to
// edit the prompt/definition the AI scores this criterion against.
export function ScoreRow({
  ordinal,
  criterion,
  isExpanded,
  onToggle,
  onNameChange,
  onPromptChange,
  onDelete,
  canDelete,
}: ScoreRowProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div
        className={`${styles.header} ${position.header}`}
        data-construction
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <span className={`${styles.ordinal} ${position.ordinal}`} data-construction>
          Score {ordinal}
        </span>
        <input
          type="text"
          className={`${styles.nameInput} ${position.nameInput}`}
          data-construction
          value={criterion.name}
          onChange={(event) => onNameChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          placeholder="Name this score"
        />
        {canDelete && (
          <button
            type="button"
            className={`${styles.deleteButton} ${position.deleteButton}`}
            data-construction
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${criterion.name || `Score ${ordinal}`}`}
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
      {isExpanded && (
        <div className={`${styles.panel} ${position.panel}`} data-construction>
          <textarea
            className={`${styles.textarea} ${position.textarea}`}
            data-construction
            value={criterion.prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder="Describe how this score is evaluated…"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
