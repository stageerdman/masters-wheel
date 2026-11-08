"use client";

// Real backend for the Chat Roleplay discipline — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec, and this update's
// Phases 17-19 for how each piece below went from scripted to real.
// Every mutation here already only ever fires on a commit/submit action
// (never a raw keystroke), so every change is persisted immediately via
// `onRoleplayChange` — no debounce needed, unlike Notes' per-keystroke
// autosave.

import { useCallback, useState } from "react";
import { readSettings } from "@/lib/settings";
import { generateInsight, generateRoleplayTurn, generateSetupReply } from "@/lib/roleplay";
import {
  emptyRoleplayState,
  type LockedAssumption,
  type ProposalCardData,
  type RoleplayState,
  type RoleplayTurn,
  type SessionRound,
  type SetupBlock,
} from "./ChatRoleplaySession.data";

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Text-only, speaker-labeled transcript for a round — fed to
// generate_insight. Never includes a thought: a coach reasoning about
// "how did the trainee do" should judge what was actually said, not a
// private persona feeling the trainee never saw either.
function renderTranscript(turns: RoleplayTurn[]): string {
  return turns.map((turn) => `${turn.speaker === "persona" ? "Persona" : "Trainee"}: ${turn.text}`).join("\n");
}

// Pulls a short display name out of "Persona: Marcus Webb, IT Director ·
// ..." style meta text — falls back to the scenario title, then a plain
// "Persona", so RoleplayChat always has *something* to label the other
// speaker with regardless of how the designer AI phrased its proposal.
function personaLabelFrom(scenarioMeta: string, scenarioTitle: string): string {
  const match = scenarioMeta.match(/Persona:\s*([^,·]+)/i);
  const name = match?.[1]?.trim();
  if (name) return name;
  return scenarioTitle || "Persona";
}

export function useChatRoleplaySession(
  initialRoleplay: RoleplayState | null,
  onRoleplayChange: (state: RoleplayState) => void,
) {
  const [state, setState] = useState<RoleplayState>(() => initialRoleplay ?? emptyRoleplayState());
  const [activeRoundId, setActiveRoundId] = useState<string | null>(
    () => state.rounds[state.rounds.length - 1]?.id ?? null,
  );

  const [isSendingSetup, setIsSendingSetup] = useState(false);
  const [isBeginning, setIsBeginning] = useState(false);
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [isAdvancingSession, setIsAdvancingSession] = useState(false);
  const [isGeneratingFinalReport, setIsGeneratingFinalReport] = useState(false);

  const [editingAssumptionRowId, setEditingAssumptionRowId] = useState<string | null>(null);
  const [isAddingAssumptionRow, setIsAddingAssumptionRow] = useState(false);
  const [editingLockedRowId, setEditingLockedRowId] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [thoughtsVisible, setThoughtsVisible] = useState(false);

  const persist = useCallback(
    (next: RoleplayState) => {
      setState(next);
      onRoleplayChange(next);
    },
    [onRoleplayChange],
  );

  const liveRound = state.rounds[state.rounds.length - 1] ?? null;
  const activeRound = state.rounds.find((round) => round.id === activeRoundId) ?? liveRound;
  const isViewingLiveRound = Boolean(activeRound && liveRound && activeRound.id === liveRound.id);
  const personaLabel = personaLabelFrom(state.scenarioMeta, state.scenarioTitle);
  const heroSummary = [state.scenarioTitle, state.scenarioMeta].filter(Boolean).join(". ");

  function findCard(cardId: string): ProposalCardData | undefined {
    for (const block of state.setupThread) {
      if (block.kind === "card" && block.card.id === cardId) return block.card;
    }
    return undefined;
  }

  function updateCard(cardId: string, updater: (card: ProposalCardData) => ProposalCardData) {
    persist({
      ...state,
      setupThread: state.setupThread.map((block) =>
        block.kind === "card" && block.card.id === cardId ? { ...block, card: updater(block.card) } : block,
      ),
    });
  }

  function activeUnfrozenCard(thread: SetupBlock[]): ProposalCardData | undefined {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const block = thread[i];
      if (block.kind === "card") return block.card.frozen ? undefined : block.card;
    }
    return undefined;
  }

  // One real call per trainee message: either the scenario designer asks
  // another short clarifying question, or it has enough to propose a
  // concrete scenario — see roleplay.rs's generate_setup_reply for the
  // exact output contract. A failure surfaces inline as an AI text block
  // rather than silently dropping the trainee's message.
  async function submitSetupMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSendingSetup) return;
    const userBlock: SetupBlock = { id: makeId("blk"), kind: "text", role: "user", text: trimmed };
    const afterUser: RoleplayState = { ...state, setupThread: [...state.setupThread, userBlock] };
    persist(afterUser);
    setIsSendingSetup(true);
    try {
      const settings = await readSettings();
      const reply = await generateSetupReply(trimmed, state.setupSessionId, settings.businessDescription);
      if (reply.kind === "proposal" && reply.proposal) {
        const current = activeUnfrozenCard(afterUser.setupThread);
        const threadAfterFreeze = current
          ? afterUser.setupThread.map((block) =>
              block.kind === "card" && block.card.id === current.id
                ? { ...block, card: { ...block.card, frozen: true, superseded: true } }
                : block,
            )
          : afterUser.setupThread;
        const card: ProposalCardData = {
          id: makeId("card"),
          title: reply.proposal.title,
          meta: reply.proposal.meta,
          assumptions: reply.proposal.assumptions.map((assumptionText) => ({
            id: makeId("a"),
            text: assumptionText,
            checked: true,
          })),
          frozen: false,
          superseded: false,
        };
        persist({
          ...afterUser,
          setupThread: [...threadAfterFreeze, { id: makeId("blk"), kind: "card", card }],
          setupSessionId: reply.sessionId,
        });
      } else {
        const message = reply.message ?? "Sorry, I didn't catch that — could you rephrase?";
        persist({
          ...afterUser,
          setupThread: [...afterUser.setupThread, { id: makeId("blk"), kind: "text", role: "ai", text: message }],
          setupSessionId: reply.sessionId,
        });
      }
    } catch (error) {
      persist({
        ...afterUser,
        setupThread: [
          ...afterUser.setupThread,
          { id: makeId("blk"), kind: "text", role: "ai", text: `Something went wrong: ${errorMessage(error)}` },
        ],
      });
    } finally {
      setIsSendingSetup(false);
    }
  }

  function toggleAssumption(cardId: string, rowId: string) {
    updateCard(cardId, (card) => ({
      ...card,
      assumptions: card.assumptions.map((row) => (row.id === rowId ? { ...row, checked: !row.checked } : row)),
    }));
  }

  function startEditAssumption(rowId: string) {
    setEditingAssumptionRowId(rowId);
  }

  function commitEditAssumption(cardId: string, rowId: string, value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      updateCard(cardId, (card) => ({
        ...card,
        assumptions: card.assumptions.map((row) => (row.id === rowId ? { ...row, text: trimmed } : row)),
      }));
    }
    setEditingAssumptionRowId(null);
  }

  function deleteAssumption(cardId: string, rowId: string) {
    updateCard(cardId, (card) => ({ ...card, assumptions: card.assumptions.filter((row) => row.id !== rowId) }));
  }

  function startAddAssumption() {
    setIsAddingAssumptionRow(true);
  }

  function commitAddAssumption(cardId: string, value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      updateCard(cardId, (card) => ({
        ...card,
        assumptions: [...card.assumptions, { id: makeId("a"), text: trimmed, checked: true }],
      }));
    }
    setIsAddingAssumptionRow(false);
  }

  // One real call to open the scene — the persona speaks first, unprompted
  // (generate_roleplay_turn's `message: null` path). Locks in the
  // scenario's title/meta/checked assumptions as this session's permanent
  // record even if the proposal card itself is edited again later.
  async function beginRoleplay(cardId: string) {
    const card = findCard(cardId);
    if (!card || card.frozen || isBeginning) return;
    setIsBeginning(true);
    const lockedAssumptions: LockedAssumption[] = card.assumptions
      .filter((row) => row.checked)
      .map((row) => ({ id: row.id, text: row.text, history: [] }));
    const threadWithFrozenCard = state.setupThread.map((block) =>
      block.kind === "card" && block.card.id === cardId ? { ...block, card: { ...block.card, frozen: true } } : block,
    );
    try {
      const reply = await generateRoleplayTurn(
        null,
        card.title,
        card.meta,
        lockedAssumptions.map((a) => a.text),
        null,
        null,
      );
      const round: SessionRound = {
        id: makeId("round"),
        roundNumber: 1,
        turns: [
          {
            id: makeId("turn"),
            speaker: "persona",
            text: reply.reply,
            thought: reply.thought ? { author: "ai", text: reply.thought } : undefined,
          },
        ],
        adjustmentPhrase: null,
        report: null,
        claudeSessionId: reply.sessionId,
      };
      persist({
        ...state,
        setupThread: [...threadWithFrozenCard, { id: makeId("blk"), kind: "divider", label: "Roleplay begins" }],
        phase: "live",
        scenarioTitle: card.title,
        scenarioMeta: card.meta,
        lockedAssumptions,
        rounds: [round],
      });
      setActiveRoundId(round.id);
    } catch (error) {
      persist({
        ...state,
        setupThread: [
          ...state.setupThread,
          { id: makeId("blk"), kind: "text", role: "ai", text: `Something went wrong starting the roleplay: ${errorMessage(error)}` },
        ],
      });
    } finally {
      setIsBeginning(false);
    }
  }

  function toggleDetailsExpanded() {
    setDetailsExpanded((expanded) => !expanded);
  }

  function startEditLockedAssumption(rowId: string) {
    setEditingLockedRowId(rowId);
  }

  function commitEditLockedAssumption(rowId: string, value: string) {
    const trimmed = value.trim();
    const next = state.lockedAssumptions.map((row) => {
      if (row.id !== rowId) return row;
      if (!trimmed || trimmed === row.text) return row;
      return { ...row, text: trimmed, history: [...row.history, { text: row.text, at: Date.now() }] };
    });
    persist({ ...state, lockedAssumptions: next });
    setEditingLockedRowId(null);
  }

  function toggleThoughtsVisible() {
    setThoughtsVisible((visible) => !visible);
  }

  function selectRound(roundId: string) {
    setActiveRoundId(roundId);
  }

  function removeRound(roundId: string) {
    if (state.rounds.length <= 1) return;
    if (liveRound && roundId === liveRound.id) return;
    persist({ ...state, rounds: state.rounds.filter((round) => round.id !== roundId) });
    if (activeRoundId === roundId) setActiveRoundId(liveRound?.id ?? null);
  }

  // One send, one turn: the reply and its optional attached private
  // thought go out together in the UI, but only `text` is ever part of
  // the real model call's payload (generate_roleplay_turn has no
  // "thought" parameter at all) — the thought never reaches the roleplay
  // AI, enforced by that function's signature, not a runtime check. Only
  // ever acts on the live round — the composer that could call this is
  // hidden while viewing a past, read-only round (see RoleplayChat).
  async function sendTurn(text: string, thoughtText: string) {
    const trimmedText = text.trim();
    if (!trimmedText || !liveRound || isSendingTurn) return;
    const trimmedThought = thoughtText.trim();
    const liveRoundId = liveRound.id;
    const userTurn: RoleplayTurn = {
      id: makeId("turn"),
      speaker: "user",
      text: trimmedText,
      thought: trimmedThought ? { author: "user", text: trimmedThought } : undefined,
    };
    const afterUser: RoleplayState = {
      ...state,
      rounds: state.rounds.map((round) => (round.id === liveRoundId ? { ...round, turns: [...round.turns, userTurn] } : round)),
    };
    persist(afterUser);
    setIsSendingTurn(true);
    try {
      const reply = await generateRoleplayTurn(
        trimmedText,
        state.scenarioTitle,
        state.scenarioMeta,
        state.lockedAssumptions.map((a) => a.text),
        liveRound.adjustmentPhrase,
        liveRound.claudeSessionId,
      );
      const personaTurn: RoleplayTurn = {
        id: makeId("turn"),
        speaker: "persona",
        text: reply.reply,
        thought: reply.thought ? { author: "ai", text: reply.thought } : undefined,
      };
      persist({
        ...afterUser,
        rounds: afterUser.rounds.map((round) =>
          round.id === liveRoundId ? { ...round, turns: [...round.turns, personaTurn], claudeSessionId: reply.sessionId } : round,
        ),
      });
    } catch (error) {
      const errorTurn: RoleplayTurn = { id: makeId("turn"), speaker: "persona", text: `(Something went wrong: ${errorMessage(error)})` };
      persist({
        ...afterUser,
        rounds: afterUser.rounds.map((round) => (round.id === liveRoundId ? { ...round, turns: [...round.turns, errorTurn] } : round)),
      });
    } finally {
      setIsSendingTurn(false);
    }
  }

  // Ends the live round for good (a real adjustment phrase + round report,
  // both generated from its text-only transcript) and opens the next one
  // with a fresh CLI session — a round reset really does reset, only the
  // plain-text adjustment phrase crosses into the new round, never raw
  // session memory.
  async function nextSession() {
    if (!liveRound || isAdvancingSession) return;
    setIsAdvancingSession(true);
    try {
      const transcriptText = renderTranscript(liveRound.turns);
      const [phrase, report] = await Promise.all([
        generateInsight(transcriptText, "adjustment"),
        generateInsight(transcriptText, "round_report"),
      ]);
      const opening = await generateRoleplayTurn(
        null,
        state.scenarioTitle,
        state.scenarioMeta,
        state.lockedAssumptions.map((a) => a.text),
        phrase,
        null,
      );
      const newRound: SessionRound = {
        id: makeId("round"),
        roundNumber: state.rounds.length + 1,
        turns: [
          {
            id: makeId("turn"),
            speaker: "persona",
            text: opening.reply,
            thought: opening.thought ? { author: "ai", text: opening.thought } : undefined,
          },
        ],
        adjustmentPhrase: phrase,
        report: null,
        claudeSessionId: opening.sessionId,
      };
      persist({
        ...state,
        rounds: [...state.rounds.map((round) => (round.id === liveRound.id ? { ...round, report } : round)), newRound],
      });
      setActiveRoundId(newRound.id);
    } catch (error) {
      persist({
        ...state,
        rounds: state.rounds.map((round) =>
          round.id === liveRound.id ? { ...round, report: round.report ?? `Couldn't generate a report: ${errorMessage(error)}` } : round,
        ),
      });
    } finally {
      setIsAdvancingSession(false);
    }
  }

  // Real markdown — headings, bold, lists — rendered by RoleplayHero via
  // react-markdown, same library MessageList's Message.tsx already uses.
  // A real synthesis call, not a re-stitch of strings already on hand: a
  // coach's actual value is noticing trends across sessions, which only
  // generate_insight's "final_report" kind is asked to do.
  async function generateFinalReport() {
    if (isGeneratingFinalReport) return;
    setIsGeneratingFinalReport(true);
    try {
      const roundsWithReports = await Promise.all(
        state.rounds.map(async (round) => {
          if (round.report) return round;
          const report = await generateInsight(renderTranscript(round.turns), "round_report");
          return { ...round, report };
        }),
      );
      const synthesisInput = roundsWithReports
        .map(
          (round) =>
            `Session ${round.roundNumber}${round.adjustmentPhrase ? ` (started with: "${round.adjustmentPhrase}")` : ""}: ${round.report}`,
        )
        .join("\n");
      const finalReport = await generateInsight(synthesisInput, "final_report");
      persist({ ...state, rounds: roundsWithReports, finalReport });
    } catch (error) {
      persist({ ...state, finalReport: `Something went wrong generating the report: ${errorMessage(error)}` });
    } finally {
      setIsGeneratingFinalReport(false);
    }
  }

  return {
    phase: state.phase,
    setupThread: state.setupThread,
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
    lockedAssumptions: state.lockedAssumptions,
    editingLockedRowId,
    detailsExpanded,
    toggleDetailsExpanded,
    startEditLockedAssumption,
    commitEditLockedAssumption,
    finalReport: state.finalReport,
    isGeneratingFinalReport,
    generateFinalReport,

    rounds: state.rounds,
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
  };
}

export type UseChatRoleplaySession = ReturnType<typeof useChatRoleplaySession>;
