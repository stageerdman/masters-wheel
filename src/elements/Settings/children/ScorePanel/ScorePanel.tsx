"use client";

import { useState } from "react";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { ScoreRow } from "./children/ScoreRow/ScoreRow";
import position from "./ScorePanel.position.module.css";
import styles from "./ScorePanel.styles.module.css";

type ScorePanelProps = {
  criteria: ScorecardCriterionDef[];
  onChange: (next: ScorecardCriterionDef[]) => void;
};

function blankCriterion(): ScorecardCriterionDef {
  return { id: crypto.randomUUID(), name: "", prompt: "" };
}

// Keeps exactly one blank row at the end at all times — the moment the
// last row has both a name and a prompt, a fresh blank row appears after
// it, so there's always an open slot to add the next score.
function ensureTrailingBlank(list: ScorecardCriterionDef[]): ScorecardCriterionDef[] {
  const last = list[list.length - 1];
  if (!last || last.name.trim() !== "" || last.prompt.trim() !== "") {
    return [...list, blankCriterion()];
  }
  return list;
}

export function ScorePanel({ criteria, onChange }: ScorePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateCriteria(next: ScorecardCriterionDef[]) {
    onChange(ensureTrailingBlank(next));
  }

  function handleNameChange(id: string, name: string) {
    updateCriteria(criteria.map((item) => (item.id === id ? { ...item, name } : item)));
  }

  function handlePromptChange(id: string, prompt: string) {
    updateCriteria(criteria.map((item) => (item.id === id ? { ...item, prompt } : item)));
  }

  function handleDelete(id: string) {
    if (expandedId === id) setExpandedId(null);
    updateCriteria(criteria.filter((item) => item.id !== id));
  }

  return (
    <ul className={`${styles.root} ${position.root}`} data-construction>
      {criteria.map((criterion, index) => {
        const isLast = index === criteria.length - 1;
        const isBlank = criterion.name.trim() === "" && criterion.prompt.trim() === "";
        return (
          <li key={criterion.id} className={position.item} data-construction>
            <ScoreRow
              ordinal={index + 1}
              criterion={criterion}
              isExpanded={expandedId === criterion.id}
              onToggle={() => setExpandedId((current) => (current === criterion.id ? null : criterion.id))}
              onNameChange={(name) => handleNameChange(criterion.id, name)}
              onPromptChange={(prompt) => handlePromptChange(criterion.id, prompt)}
              onDelete={() => handleDelete(criterion.id)}
              canDelete={!(isLast && isBlank)}
            />
          </li>
        );
      })}
    </ul>
  );
}
