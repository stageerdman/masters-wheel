"use client";

import type { TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { RoleplayChat } from "./children/RoleplayChat/RoleplayChat";
import { RoleplayDetail } from "./children/RoleplayDetail/RoleplayDetail";
import { RoleplayHero } from "./children/RoleplayHero/RoleplayHero";
import { SetupThread } from "./children/SetupThread/SetupThread";
import { useChatRoleplaySession } from "./ChatRoleplaySession.script";
import position from "./ChatRoleplaySession.position.module.css";
import styles from "./ChatRoleplaySession.styles.module.css";

type ChatRoleplaySessionProps = {
  session: TrainingSession;
  notes: string;
  onNotesChange: (value: string) => void;
};

// Replaces the generic Hero/Detail pair for the Chat Roleplay discipline —
// see `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec. Mounted with
// `key={session.id}` by TrainingRoom.tsx, so switching sessions is a
// fresh mount rather than needing a manual multi-field state reset.
export function ChatRoleplaySession({ session, notes, onNotesChange }: ChatRoleplaySessionProps) {
  const {
    phase,
    setupThread,
    isBeginning,
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
    lockedAssumptions,
    editingLockedRowId,
    heroPopoverOpen,
    toggleHeroPopover,
    startEditLockedAssumption,
    commitEditLockedAssumption,
    turns,
    thoughtsVisible,
    toggleThoughtsVisible,
    sendTurn,
    sessionRound,
    adjustmentPhrases,
    nextSessionNotice,
    nextSession,
  } = useChatRoleplaySession();

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {phase === "setup" ? (
        <SetupThread
          thread={setupThread}
          editingAssumptionRowId={editingAssumptionRowId}
          isAddingAssumptionRow={isAddingAssumptionRow}
          isBeginning={isBeginning}
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
            summary={heroSummary}
            lockedAssumptions={lockedAssumptions}
            popoverOpen={heroPopoverOpen}
            editingRowId={editingLockedRowId}
            sessionRound={sessionRound}
            adjustmentPhrases={adjustmentPhrases}
            nextSessionNotice={nextSessionNotice}
            onTogglePopover={toggleHeroPopover}
            onStartEdit={startEditLockedAssumption}
            onCommitEdit={commitEditLockedAssumption}
            onNextSession={nextSession}
          />
          <div className={position.liveBody} data-construction>
            <RoleplayChat
              turns={turns}
              thoughtsVisible={thoughtsVisible}
              onToggleThoughts={toggleThoughtsVisible}
              onSend={sendTurn}
            />
            <RoleplayDetail sessionId={session.id} notes={notes} onNotesChange={onNotesChange} />
          </div>
        </>
      )}
    </div>
  );
}
