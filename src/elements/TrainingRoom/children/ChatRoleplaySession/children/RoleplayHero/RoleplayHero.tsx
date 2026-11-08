"use client";

import { useState } from "react";
import { HERO_NAME, type LockedAssumption } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";
import position from "./RoleplayHero.position.module.css";
import styles from "./RoleplayHero.styles.module.css";

type RoleplayHeroProps = {
  summary: string;
  lockedAssumptions: LockedAssumption[];
  popoverOpen: boolean;
  editingRowId: string | null;
  sessionRound: number;
  adjustmentPhrases: string[];
  nextSessionNotice: string | null;
  onTogglePopover: () => void;
  onStartEdit: (rowId: string) => void;
  onCommitEdit: (rowId: string, value: string) => void;
  onNextSession: () => void;
};

// "The Plaque": at rest, just the scenario name and a 2-line summary — the
// assumptions (and, now, the accumulated Next Session adjustments) stay
// behind a quiet click-to-open disclosure rather than permanently eating
// vertical space from the chat below. This is the part the user asked
// for explicitly — "clickable details... so I click on that and I can
// see the session description."
export function RoleplayHero({
  summary,
  lockedAssumptions,
  popoverOpen,
  editingRowId,
  sessionRound,
  adjustmentPhrases,
  nextSessionNotice,
  onTogglePopover,
  onStartEdit,
  onCommitEdit,
  onNextSession,
}: RoleplayHeroProps) {
  const [draftValue, setDraftValue] = useState("");

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.row1} data-construction>
        <span className={`${styles.dot} ${position.dot}`} data-construction />
        <span className={`${styles.name} ${position.name}`} data-construction>
          {HERO_NAME}
        </span>
        {sessionRound > 1 && (
          <span className={`${styles.roundBadge} ${position.roundBadge}`} data-construction>
            Session {sessionRound}
          </span>
        )}
        <button type="button" className={`${styles.footnote} ${position.footnote}`} data-construction onClick={onTogglePopover}>
          {lockedAssumptions.length} assumption{lockedAssumptions.length === 1 ? "" : "s"}
        </button>
        <button type="button" className={`${styles.nextButton} ${position.nextButton}`} data-construction onClick={onNextSession}>
          Next Session
        </button>
      </div>
      <p className={`${styles.summary} ${position.summary}`} data-construction>
        {summary}
      </p>
      {nextSessionNotice && (
        <div className={`${styles.notice} ${position.notice}`} data-construction>
          Starting Session {sessionRound} — adjustment: “{nextSessionNotice}”
        </div>
      )}
      {popoverOpen && (
        <div className={`${styles.popover} ${position.popover}`} data-construction>
          <h3 className={position.popoverHeading} data-construction>
            Scenario
          </h3>
          <p className={`${styles.fullSummary} ${position.fullSummary}`} data-construction>
            {summary}
          </p>
          <div className={position.assumptions} data-construction>
            {lockedAssumptions.map((row) => (
              <div key={row.id} className={position.lockRow} data-construction>
                {editingRowId === row.id ? (
                  <input
                    type="text"
                    className={`${styles.editInput} ${position.editInput}`}
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
                  <>
                    <span className={`${styles.lockText} ${position.lockText}`} data-construction>
                      {row.text}
                    </span>
                    {row.history.length > 0 && (
                      <span
                        className={`${styles.amendClock} ${position.amendClock}`}
                        data-construction
                        title={`Changed just now — was: ${row.history[row.history.length - 1].text}`}
                      >
                        ↻
                      </span>
                    )}
                    <button
                      type="button"
                      className={`${styles.editPencil} ${position.editPencil}`}
                      data-construction
                      aria-label="Amend this assumption"
                      onClick={() => onStartEdit(row.id)}
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          {adjustmentPhrases.length > 0 && (
            <div className={position.adjustments} data-construction>
              <h4 className={position.adjustmentsHeading} data-construction>
                Session adjustments
              </h4>
              <ul className={position.adjustmentsList} data-construction>
                {adjustmentPhrases.map((phrase, index) => (
                  <li key={index} className={`${styles.adjustmentItem} ${position.adjustmentItem}`} data-construction>
                    Session {index + 2}: {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
