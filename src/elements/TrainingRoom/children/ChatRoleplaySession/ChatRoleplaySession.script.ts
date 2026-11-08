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
  SETUP_OPENING_MESSAGE,
  type AssumptionRow,
  type LockedAssumption,
  type ProposalCardData,
  type RoleplayTurn,
  type SetupBlock,
} from "./ChatRoleplaySession.data";

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
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

  // Frozen at confirmation, generated once from the whole setup
  // conversation — nothing in this prototype round ever rewrites it
  // (only the assumptions below are amendable post-lock).
  const heroSummary = HERO_SUMMARY;
  const [lockedAssumptions, setLockedAssumptions] = useState<LockedAssumption[]>([]);
  const [editingLockedRowId, setEditingLockedRowId] = useState<string | null>(null);
  const [heroPopoverOpen, setHeroPopoverOpen] = useState(false);

  const [turns, setTurns] = useState<RoleplayTurn[]>([]);
  const [thoughtsVisible, setThoughtsVisible] = useState(false);
  const [replyCursor, setReplyCursor] = useState(0);

  const [sessionRound, setSessionRound] = useState(1);
  const [adjustmentPhrases, setAdjustmentPhrases] = useState<string[]>([]);
  const [nextSessionNotice, setNextSessionNotice] = useState<string | null>(null);

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
        setPhase("live");
        setTurns([
          {
            id: makeId("turn"),
            speaker: "persona",
            text: PERSONA_OPENING_LINE,
            thought: { author: PERSONA_OPENING.author, text: PERSONA_OPENING.text },
          },
        ]);
        setIsBeginning(false);
      }, 260);
    }, 260);
  }

  function toggleHeroPopover() {
    setHeroPopoverOpen((open) => !open);
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

  // One send, one turn: the reply and its optional attached private
  // thought go out together — the thought never reaches the roleplay AI
  // (there's no payload here that would even carry it anywhere; once a
  // real model call exists, only `text` belongs in that request).
  function sendTurn(text: string, thoughtText: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    const trimmedThought = thoughtText.trim();
    setTurns((current) => [
      ...current,
      {
        id: makeId("turn"),
        speaker: "user",
        text: trimmedText,
        thought: trimmedThought ? { author: "user", text: trimmedThought } : undefined,
      },
    ]);
    const reply = PERSONA_REPLY_POOL[replyCursor % PERSONA_REPLY_POOL.length];
    setReplyCursor((cursor) => cursor + 1);
    window.setTimeout(() => {
      setTurns((current) => [
        ...current,
        { id: makeId("turn"), speaker: "persona", text: reply.text, thought: { author: "ai", text: reply.thought } },
      ]);
    }, 650);
  }

  function nextSession() {
    const phrase = ADJUSTMENT_PHRASE_POOL[sessionRound % ADJUSTMENT_PHRASE_POOL.length];
    setAdjustmentPhrases((phrases) => [...phrases, phrase]);
    setSessionRound((round) => round + 1);
    setTurns([{ id: makeId("turn"), speaker: "persona", text: PERSONA_OPENING_LINE, thought: PERSONA_OPENING }]);
    setNextSessionNotice(phrase);
    window.setTimeout(() => setNextSessionNotice(null), 3500);
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
  };
}

export type UseChatRoleplaySession = ReturnType<typeof useChatRoleplaySession>;
