"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { LockedAssumption, SessionRound } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";
import position from "./RoleplayHero.position.module.css";
import styles from "./RoleplayHero.styles.module.css";

type RoleplayHeroProps = {
  sessionName: string;
  onNameChange: (name: string) => void;
  summary: string;
  finalReport: string | null;
  lockedAssumptions: LockedAssumption[];
  editingRowId: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onStartEdit: (rowId: string) => void;
  onCommitEdit: (rowId: string, value: string) => void;
  rounds: SessionRound[];
  activeRoundId: string | null;
  liveRoundId: string | null;
  onSelectRound: (roundId: string) => void;
  onRemoveRound: (roundId: string) => void;
  onNextSession: () => void;
  onGenerateFinalReport: () => void;
  isAdvancingSession: boolean;
  isGeneratingFinalReport: boolean;
};

// The final report is real markdown (bold, blank-line paragraphs, a
// heading or two) — reusing react-markdown exactly as MessageList's
// Message.tsx already does, not a hand-rolled parser. Every heading
// level maps to the one same sectionHeading style "Assumptions"/
// "Sessions" already use below, by design — the report isn't allowed a
// second, different title style.
const reportComponents: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
  p: (props) => <p className={`${styles.summary} ${position.summary}`} data-construction {...props} />,
  h1: (props) => <p className={`${styles.sectionHeading} ${position.sectionHeading}`} data-construction {...props} />,
  h2: (props) => <p className={`${styles.sectionHeading} ${position.sectionHeading}`} data-construction {...props} />,
  h3: (props) => <p className={`${styles.sectionHeading} ${position.sectionHeading}`} data-construction {...props} />,
  ul: (props) => <ul className={`${styles.reportList} ${position.reportList}`} data-construction {...props} />,
  li: (props) => <li className={position.reportListItem} data-construction {...props} />,
};

// Collapsed, this is one line: a green "set up" dot and the scenario's
// name — the same name as the session's own row in Navigation, editable
// from either place (both write through the same onNameChange). Clicking
// anywhere on that line is the only way to expand it. Next Session and
// Generate final report sit in their own pinned column on the right —
// Next Session is reachable even while collapsed; Generate final report
// joins underneath it only once expanded — so neither ever scrolls out
// of reach no matter how long the description/assumptions/sessions list
// underneath grows (that list gets its own internal scroll instead).
export function RoleplayHero({
  sessionName,
  onNameChange,
  summary,
  finalReport,
  lockedAssumptions,
  editingRowId,
  expanded,
  onToggleExpanded,
  onStartEdit,
  onCommitEdit,
  rounds,
  activeRoundId,
  liveRoundId,
  onSelectRound,
  onRemoveRound,
  onNextSession,
  onGenerateFinalReport,
  isAdvancingSession,
  isGeneratingFinalReport,
}: RoleplayHeroProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.main} data-construction>
        <button
          type="button"
          className={`${styles.bar} ${position.bar}`}
          data-construction
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse session details" : "Expand session details"}
        >
          <span className={`${styles.dot} ${position.dot}`} data-construction aria-hidden="true" />
          {isEditingName ? (
            <input
              className={`${styles.nameInput} ${position.nameInput}`}
              data-construction
              value={sessionName}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onNameChange(event.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
              }}
              aria-label="Session name"
            />
          ) : (
            <span
              className={`${styles.name} ${position.name}`}
              data-construction
              onClick={(event) => {
                event.stopPropagation();
                setIsEditingName(true);
              }}
              title="Click to rename"
            >
              {sessionName}
            </span>
          )}
          <span className={`${styles.chevron} ${position.chevron}`} data-construction aria-hidden="true">
            {expanded ? "⌃" : "⌄"}
          </span>
        </button>
        {expanded && (
          <div className={`${styles.panel} ${position.panel}`} data-construction>
            {finalReport ? (
              <ReactMarkdown components={reportComponents}>{finalReport}</ReactMarkdown>
            ) : (
              <p className={`${styles.summary} ${position.summary}`} data-construction>
                {summary}
              </p>
            )}

            <h4 className={`${styles.sectionHeading} ${position.sectionHeading}`} data-construction>
              Assumptions
            </h4>
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

            <h4 className={`${styles.sectionHeading} ${position.sectionHeading}`} data-construction>
              Sessions
            </h4>
            <ul className={position.roundsList} data-construction>
              {rounds.map((round) => {
                const isActive = round.id === activeRoundId;
                const isLive = round.id === liveRoundId;
                return (
                  <li
                    key={round.id}
                    className={`${position.roundRow} ${isActive ? styles.roundRowActive : ""}`}
                    data-construction
                  >
                    <button
                      type="button"
                      className={`${styles.roundButton} ${position.roundButton}`}
                      data-construction
                      onClick={() => onSelectRound(round.id)}
                    >
                      <span className={styles.roundLabel} data-construction>
                        Session {round.roundNumber}
                        {isLive && (
                          <span className={`${styles.liveBadge} ${position.liveBadge}`} data-construction>
                            {" "}
                            · Live
                          </span>
                        )}
                      </span>
                      {round.adjustmentPhrase && (
                        <span className={`${styles.roundMeta} ${position.roundMeta}`} data-construction>
                          Adjustment: {round.adjustmentPhrase}
                        </span>
                      )}
                      {round.report && (
                        <span className={`${styles.roundMeta} ${position.roundMeta}`} data-construction>
                          {round.report}
                        </span>
                      )}
                    </button>
                    {!isLive && rounds.length > 1 && (
                      <button
                        type="button"
                        className={`${styles.roundDelete} ${position.roundDelete}`}
                        data-construction
                        aria-label={`Remove Session ${round.roundNumber}`}
                        onClick={() => onRemoveRound(round.id)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div className={`${styles.actions} ${position.actions}`} data-construction>
        <button
          type="button"
          className={`${styles.nextButton} ${position.nextButton}`}
          data-construction
          onClick={onNextSession}
          disabled={isAdvancingSession}
        >
          {isAdvancingSession ? "Starting…" : "Next Session"}
        </button>
        {expanded && (
          <button
            type="button"
            className={`${styles.reportButton} ${position.reportButton}`}
            data-construction
            onClick={onGenerateFinalReport}
            disabled={isGeneratingFinalReport}
          >
            {isGeneratingFinalReport ? "Generating…" : "Generate final report"}
          </button>
        )}
      </div>
    </section>
  );
}
