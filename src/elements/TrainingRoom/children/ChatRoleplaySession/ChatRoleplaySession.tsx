"use client";

import type { TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { RoleplayChat } from "./children/RoleplayChat/RoleplayChat";
import { CHAT_ROLEPLAY_DETAIL_KIND_ORDER } from "@/elements/TrainingRoom/TrainingRoom.data";
import { Detail } from "../Detail/Detail";
import { AITrainerPane } from "./children/AITrainerPane/AITrainerPane";
import { RoleplayHero } from "./children/RoleplayHero/RoleplayHero";
import { SetupThread } from "./children/SetupThread/SetupThread";
import { useChatRoleplaySession } from "./ChatRoleplaySession.script";
import type { RoleplayState } from "./ChatRoleplaySession.data";
import position from "./ChatRoleplaySession.position.module.css";
import styles from "./ChatRoleplaySession.styles.module.css";

type ChatRoleplaySessionProps = {
  session: TrainingSession;
  notes: string;
  onNotesChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onRoleplayChange: (state: RoleplayState) => void;
};

// Replaces the generic Hero/Detail pair for the Chat Roleplay discipline —
// see `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec. Mounted with
// `key={session.id}` by TrainingRoom.tsx, so switching sessions is a
// fresh mount rather than needing a manual multi-field state reset.
export function ChatRoleplaySession({ session, notes, onNotesChange, onNameChange, onRoleplayChange }: ChatRoleplaySessionProps) {
  const {
    phase,
    setupThread,
    isBeginning,
    isSendingSetup,
    editingAssumptionRowId,
    isAddingAssumptionRow,
    submitSetupMessage,
    toggleAssumption,
    startEditAssumption,
    commitEditAssumption,
    deleteAssumption,
    startAddAssumption,
    commitAddAssumption,
    beginRoleplay,
    heroSummary,
    personaLabel,
    lockedAssumptions,
    editingLockedRowId,
    detailsExpanded,
    toggleDetailsExpanded,
    startEditLockedAssumption,
    commitEditLockedAssumption,
    finalReport,
    isGeneratingFinalReport,
    generateFinalReport,
    rounds,
    activeRound,
    isViewingLiveRound,
    selectRound,
    removeRound,
    thoughtsVisible,
    toggleThoughtsVisible,
    sendTurn,
    isSendingTurn,
    nextSession,
    isAdvancingSession,
  } = useChatRoleplaySession(session.roleplay, onRoleplayChange);

  const liveRound = rounds[rounds.length - 1] ?? null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {phase === "setup" ? (
        <SetupThread
          thread={setupThread}
          editingAssumptionRowId={editingAssumptionRowId}
          isAddingAssumptionRow={isAddingAssumptionRow}
          isBeginning={isBeginning}
          isSending={isSendingSetup}
          onSubmitMessage={submitSetupMessage}
          onToggleRow={toggleAssumption}
          onStartEdit={startEditAssumption}
          onCommitEdit={commitEditAssumption}
          onDeleteRow={deleteAssumption}
          onStartAdd={startAddAssumption}
          onCommitAdd={commitAddAssumption}
          onBegin={beginRoleplay}
        />
      ) : (
        <>
          <RoleplayHero
            sessionName={session.name}
            onNameChange={onNameChange}
            summary={heroSummary}
            finalReport={finalReport}
            lockedAssumptions={lockedAssumptions}
            editingRowId={editingLockedRowId}
            expanded={detailsExpanded}
            onToggleExpanded={toggleDetailsExpanded}
            onStartEdit={startEditLockedAssumption}
            onCommitEdit={commitEditLockedAssumption}
            rounds={rounds}
            activeRoundId={activeRound?.id ?? null}
            liveRoundId={liveRound?.id ?? null}
            onSelectRound={selectRound}
            onRemoveRound={removeRound}
            onNextSession={nextSession}
            isAdvancingSession={isAdvancingSession}
            onGenerateFinalReport={generateFinalReport}
            isGeneratingFinalReport={isGeneratingFinalReport}
          />
          <div className={position.liveBody} data-construction>
            {activeRound && (
              <RoleplayChat
                turns={activeRound.turns}
                thoughtsVisible={thoughtsVisible}
                onToggleThoughts={toggleThoughtsVisible}
                onSend={sendTurn}
                isReadOnly={!isViewingLiveRound}
                isSending={isSendingTurn}
                personaLabel={personaLabel}
                roundNumber={activeRound.roundNumber}
                onJumpToLive={() => liveRound && selectRound(liveRound.id)}
              />
            )}
            <Detail
              sessionId={session.id}
              notes={notes}
              onNotesChange={onNotesChange}
              kindOrder={CHAT_ROLEPLAY_DETAIL_KIND_ORDER}
              storageKey={`chat-roleplay-detail-split-${session.id}`}
              renderKind={(kind) => (kind === "trainer" ? <AITrainerPane sessionId={session.id} /> : null)}
              notesPlaceholder="Notes — private. Never seen by the AI Trainer or the roleplay AI."
            />
          </div>
        </>
      )}
    </div>
  );
}
