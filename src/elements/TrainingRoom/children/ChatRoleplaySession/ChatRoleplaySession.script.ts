"use client";

// All state for the Chat Roleplay prototype lives here — local component
// state only, nothing persisted to disk (the one real exception, Notes,
// is threaded through from TrainingRoom.script.ts's already-real
// session.notes, not owned by this hook). See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec this implements, and
// what's expected to carry over once this becomes a real backend.

import { useState } from "react";
import {
  freshProposalCard,
  ADJUSTMENT_PHRASE_POOL,
  HERO_SUMMARY,
  PERSONA_OPENING,
  PERSONA_OPENING_LINE,
  PERSONA_REPLY_POOL,
  REFINED_META,
  ROUND_REPORT_FLAVOR_POOL,
  SETUP_OPENING_MESSAGE,
  type AssumptionRow,
  type LockedAssumption,
  type ProposalCardData,
  type SessionRound,
  type SetupBlock,
} from "./ChatRoleplaySession.data";

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

function freshRound(roundNumber: number, adjustmentPhrase: string | null): SessionRound {
  return {
    id: makeId("round"),
    roundNumber,
    turns: [
      {
        id: makeId("turn"),
        speaker: "persona",
        text: PERSONA_OPENING_LINE,
        thought: { author: PERSONA_OPENING.author, text: PERSONA_OPENING.text },
      },
    ],
    adjustmentPhrase,
    report: null,
  };
}

function reportFor(round: SessionRound): string {
  const replies = round.turns.filter((turn) => turn.speaker === "user").length;
  const flavor = ROUND_REPORT_FLAVOR_POOL[(round.roundNumber - 1) % ROUND_REPORT_FLAVOR_POOL.length];
  return `${replies} repl${replies === 1 ? "y" : "ies"} exchanged. ${flavor}`;
}

export function useChatRoleplaySession() {
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [setupThread, setSetupThread] = useState<SetupBlock[]>([
    { id: makeId("blk"), kind: "text", role: "ai", text: SETUP_OPENING_MESSAGE },
  ]);
  const [isBeginning, setIsBeginning] = useState(false);
  const [refinedOnce, setRefinedOnce] = useState(false);
  const [editingAssumptionRowId, setEditingAssumptionRowId] = useState<string | null>(null);
  const [isAddingAssumptionRow, setIsAddingAssumptionRow] = useState(false);

  const [heroSummary] = useState(HERO_SUMMARY);
  const [lockedAssumptions, setLockedAssumptions] = useState<LockedAssumption[]>([]);
  const [editingLockedRowId, setEditingLockedRowId] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  const [rounds, setRounds] = useState<SessionRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [thoughtsVisible, setThoughtsVisible] = useState(false);
  const [replyCursor, setReplyCursor] = useState(0);

  const liveRound = rounds[rounds.length - 1] ?? null;
  const activeRound = rounds.find((round) => round.id === activeRoundId) ?? liveRound;
  const isViewingLiveRound = Boolean(activeRound && liveRound && activeRound.id === liveRound.id);

  function findCard(cardId: string): ProposalCardData | undefined {
    for (const block of setupThread) {
      if (block.kind === "card" && block.card.id === cardId) return block.card;
    }
    return undefined;
  }

  function updateCard(cardId: string, updater: (card: ProposalCardData) => ProposalCardData) {
    setSetupThread((current) =>
      current.map((block) => (block.kind === "card" && block.card.id === cardId ? { ...block, card: updater(block.card) } : block)),
    );
  }

  function activeUnfrozenCard(): ProposalCardData | undefined {
    for (let i = setupThread.length - 1; i >= 0; i -= 1) {
      const block = setupThread[i];
      if (block.kind === "card") return block.card.frozen ? undefined : block.card;
    }
    return undefined;
  }

  function submitSetupMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSetupThread((current) => [...current, { id: makeId("blk"), kind: "text", role: "user", text: trimmed }]);

    const current = activeUnfrozenCard();
    window.setTimeout(() => {
      if (!current) {
        const card = freshProposalCard(makeId("card"));
        setSetupThread((blocks) => [...blocks, { id: makeId("blk"), kind: "card", card }]);
        return;
      }
      setSetupThread((blocks) => {
        const next = blocks.map((block) =>
          block.kind === "card" && block.card.id === current.id ? { ...block, card: { ...block.card, frozen: true, superseded: true } } : block,
        );
        const clonedAssumptions: AssumptionRow[] = current.assumptions.map((row) => ({ ...row }));
        const nextCard: ProposalCardData = {
          id: makeId("card"),
          title: current.title,
          meta: refinedOnce ? `${current.meta} · Updated: ${trimmed.slice(0, 40)}` : REFINED_META,
          assumptions: clonedAssumptions,
          frozen: false,
          superseded: false,
        };
        if (!refinedOnce) setRefinedOnce(true);
        return [...next, { id: makeId("blk"), kind: "card", card: nextCard }];
      });
    }, 420);
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

  function beginRoleplay(cardId: string) {
    const card = findCard(cardId);
    if (!card || card.frozen) return;
    setIsBeginning(true);
    window.setTimeout(() => {
      updateCard(cardId, (current) => ({ ...current, frozen: true }));
      setLockedAssumptions(
        card.assumptions.filter((row) => row.checked).map((row) => ({ id: row.id, text: row.text, history: [] })),
      );
      setSetupThread((blocks) => [...blocks, { id: makeId("blk"), kind: "divider", label: "Roleplay begins" }]);
      window.setTimeout(() => {
        const round = freshRound(1, null);
        setRounds([round]);
        setActiveRoundId(round.id);
        setPhase("live");
        setIsBeginning(false);
      }, 260);
    }, 260);
  }

  function toggleDetailsExpanded() {
    setDetailsExpanded((expanded) => !expanded);
  }

  function startEditLockedAssumption(rowId: string) {
    setEditingLockedRowId(rowId);
  }

  function commitEditLockedAssumption(rowId: string, value: string) {
    const trimmed = value.trim();
    setLockedAssumptions((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        if (!trimmed || trimmed === row.text) return row;
        return { ...row, text: trimmed, history: [...row.history, { text: row.text, at: Date.now() }] };
      }),
    );
    setEditingLockedRowId(null);
  }

  function toggleThoughtsVisible() {
    setThoughtsVisible((visible) => !visible);
  }

  function selectRound(roundId: string) {
    setActiveRoundId(roundId);
  }

  function removeRound(roundId: string) {
    setRounds((current) => {
      if (current.length <= 1) return current;
      if (liveRound && roundId === liveRound.id) return current;
      return current.filter((round) => round.id !== roundId);
    });
    if (activeRoundId === roundId) setActiveRoundId(liveRound?.id ?? null);
  }

  // One send, one turn: the reply and its optional attached private
  // thought go out together — the thought never reaches the roleplay AI
  // (there's no payload here that would even carry it anywhere; once a
  // real model call exists, only `text` belongs in that request). Only
  // ever acts on the live round — the composer that could call this is
  // hidden while viewing a past, read-only round (see RoleplayChat).
  function sendTurn(text: string, thoughtText: string) {
    const trimmedText = text.trim();
    if (!trimmedText || !liveRound) return;
    const trimmedThought = thoughtText.trim();
    const liveRoundId = liveRound.id;
    setRounds((current) =>
      current.map((round) =>
        round.id === liveRoundId
          ? {
              ...round,
              turns: [
                ...round.turns,
                {
                  id: makeId("turn"),
                  speaker: "user",
                  text: trimmedText,
                  thought: trimmedThought ? { author: "user", text: trimmedThought } : undefined,
                },
              ],
            }
          : round,
      ),
    );
    const reply = PERSONA_REPLY_POOL[replyCursor % PERSONA_REPLY_POOL.length];
    setReplyCursor((cursor) => cursor + 1);
    window.setTimeout(() => {
      setRounds((current) =>
        current.map((round) =>
          round.id === liveRoundId
            ? {
                ...round,
                turns: [
                  ...round.turns,
                  { id: makeId("turn"), speaker: "persona", text: reply.text, thought: { author: "ai", text: reply.thought } },
                ],
              }
            : round,
        ),
      );
    }, 650);
  }

  function nextSession() {
    if (!liveRound) return;
    const finishedRoundId = liveRound.id;
    const phrase = ADJUSTMENT_PHRASE_POOL[rounds.length % ADJUSTMENT_PHRASE_POOL.length];
    const newRound = freshRound(rounds.length + 1, phrase);
    setRounds((current) => [
      ...current.map((round) => (round.id === finishedRoundId ? { ...round, report: reportFor(round) } : round)),
      newRound,
    ]);
    setActiveRoundId(newRound.id);
  }

  // Real markdown — bold, blank-line paragraphs, a heading or two —
  // rendered by RoleplayHero via react-markdown, same library
  // MessageList's Message.tsx already uses. Every heading here maps to
  // the one shared "Assumptions"/"Sessions" title style; this is
  // deliberately the only title format the report is allowed to use.
  function generateFinalReport() {
    const totalRounds = rounds.length;
    // Every round gets a real report at this point, including the still-
    // live one — generating the final report doesn't end it, it just
    // means there's nothing left unreported when looking back.
    const withReports = rounds.map((round) => (round.report ? round : { ...round, report: reportFor(round) }));
    setRounds(withReports);

    const adjustmentLines = withReports
      .filter((round) => round.adjustmentPhrase)
      .map((round) => `- **Session ${round.roundNumber}** — ${round.adjustmentPhrase}`);
    const reportLines = withReports.map(
      (round) => `- **Session ${round.roundNumber}${round.id === liveRound?.id ? " (current)" : ""}** — ${round.report}`,
    );

    const sections = [
      "## Training Report",
      `Trained a cold-call opener against **Marcus Webb**, a skeptical, impatient enterprise IT director.`,
      `**${totalRounds} session${totalRounds === 1 ? "" : "s"} completed.**`,
    ];
    if (adjustmentLines.length > 0) {
      sections.push("## What Changed Each Session", adjustmentLines.join("\n"));
    }
    sections.push("## Session Reports", reportLines.join("\n"));

    setFinalReport(sections.join("\n\n"));
  }

  return {
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
    detailsExpanded,
    toggleDetailsExpanded,
    startEditLockedAssumption,
    commitEditLockedAssumption,
    finalReport,
    generateFinalReport,

    rounds,
    activeRound,
    isViewingLiveRound,
    selectRound,
    removeRound,
    thoughtsVisible,
    toggleThoughtsVisible,
    sendTurn,
    nextSession,
  };
}

export type UseChatRoleplaySession = ReturnType<typeof useChatRoleplaySession>;
