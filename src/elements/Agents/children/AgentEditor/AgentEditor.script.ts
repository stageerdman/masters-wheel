import { useEffect, useRef, useState } from "react";
import type { AgentFields, CoachAgent, KnowledgeFile } from "@/elements/Agents/Agents.data";

export function deriveNickname(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

function extractFields(agent: CoachAgent): AgentFields {
  return {
    name: agent.name,
    nickname: agent.nickname,
    nicknameLocked: agent.nicknameLocked,
    description: agent.description,
    instructions: agent.instructions,
    photoUrl: agent.photoUrl,
    knowledgeFiles: agent.knowledgeFiles,
  };
}

function fieldsEqual(a: AgentFields, b: AgentFields) {
  return (
    a.name === b.name &&
    a.nickname === b.nickname &&
    a.nicknameLocked === b.nicknameLocked &&
    a.description === b.description &&
    a.instructions === b.instructions &&
    a.photoUrl === b.photoUrl &&
    JSON.stringify(a.knowledgeFiles) === JSON.stringify(b.knowledgeFiles)
  );
}

// Owns one agent's editable draft for the life of the editor. The editor
// remounts via key={agent.id} whenever the selected agent changes (see
// AgentEditor.tsx), so this hook's state — including the undo/redo stack —
// naturally starts fresh per agent, matching the dictated "per-agent,
// discarded on switching agents" behavior without extra bookkeeping here.
//
// Save is a hard wall: it commits the draft to the parent and clears the
// undo stack (see this update's wiki.md for why). Text fields only push
// an undo entry on blur, and only if the value actually changed since
// focus — so native per-field undo keeps working untouched while a field
// is focused. Non-text actions (photo, knowledge files, restoring a
// version) commit immediately as one step.
export function useAgentDraft(agent: CoachAgent, onSave: (fields: AgentFields) => void) {
  const initial = extractFields(agent);
  const [draft, setDraft] = useState<AgentFields>(initial);
  const [savedFields, setSavedFields] = useState<AgentFields>(initial);
  const [past, setPast] = useState<AgentFields[]>([]);
  const [future, setFuture] = useState<AgentFields[]>([]);
  const focusSnapshotRef = useRef<AgentFields | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const dirty = !fieldsEqual(draft, savedFields);

  function commitImmediate(next: AgentFields) {
    if (fieldsEqual(next, draft)) return;
    setPast((p) => [...p, draft]);
    setFuture([]);
    setDraft(next);
  }

  function setName(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      nickname: current.nicknameLocked ? current.nickname : deriveNickname(value),
    }));
  }

  // Locks the moment the user types a value that differs from what
  // auto-derivation would currently produce; clearing it back to empty
  // unlocks it and re-derives immediately (see this update's wiki.md).
  function setNickname(value: string) {
    setDraft((current) => {
      const derived = deriveNickname(current.name);
      if (value === "") return { ...current, nickname: derived, nicknameLocked: false };
      return { ...current, nickname: value, nicknameLocked: value !== derived };
    });
  }

  function setDescription(value: string) {
    setDraft((current) => ({ ...current, description: value }));
  }

  function setInstructions(value: string) {
    setDraft((current) => ({ ...current, instructions: value }));
  }

  function handleFocusField() {
    focusSnapshotRef.current = draft;
  }

  function handleBlurField() {
    const before = focusSnapshotRef.current;
    focusSnapshotRef.current = null;
    if (!before || fieldsEqual(before, draft)) return;
    setPast((p) => [...p, before]);
    setFuture([]);
  }

  function setPhoto(photoUrl: string | null) {
    commitImmediate({ ...draft, photoUrl });
  }

  function addKnowledgeFile(file: KnowledgeFile) {
    commitImmediate({ ...draft, knowledgeFiles: [...draft.knowledgeFiles, file] });
  }

  function removeKnowledgeFile(id: string) {
    commitImmediate({ ...draft, knowledgeFiles: draft.knowledgeFiles.filter((file) => file.id !== id) });
  }

  // One atomic commit, same as any other action — one Cmd+Z right after a
  // restore snaps back to whatever was live a moment before it.
  function restore(fields: AgentFields) {
    commitImmediate(fields);
  }

  function undo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([draft, ...future]);
    setDraft(previous);
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, draft]);
    setDraft(next);
  }

  function save() {
    onSave(draft);
    setSavedFields(draft);
    setPast([]);
    setFuture([]);
  }

  // Refs so the stable keydown listener below always calls the latest
  // closures without needing to re-attach on every render. Written inside
  // an effect (not during render) per the project's react-hooks/refs rule.
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      const active = document.activeElement;
      const isTextEditable =
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLInputElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      // Let native per-field undo run untouched while a field is focused.
      if (isTextEditable) return;
      // Scoped to this editor: ignore the shortcut if focus has wandered
      // elsewhere on the page (or nowhere, i.e. document.body).
      if (rootRef.current && active && active !== document.body && !rootRef.current.contains(active)) return;
      event.preventDefault();
      if (event.shiftKey) redoRef.current();
      else undoRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    draft,
    dirty,
    rootRef,
    setName,
    setNickname,
    setDescription,
    setInstructions,
    handleFocusField,
    handleBlurField,
    setPhoto,
    addKnowledgeFile,
    removeKnowledgeFile,
    restore,
    save,
  };
}
