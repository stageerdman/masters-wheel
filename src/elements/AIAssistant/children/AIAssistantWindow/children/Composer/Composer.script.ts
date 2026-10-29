import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";

type ActiveMention = { start: number; query: string };

// The @mention currently being typed, if the cursor sits right after an
// unbroken "@word" with no whitespace in between.
function findActiveMention(value: string, cursor: number): ActiveMention | null {
  const upToCursor = value.slice(0, cursor);
  const at = upToCursor.lastIndexOf("@");
  if (at === -1) return null;
  const query = upToCursor.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

// Typing "@" opens a picker suggesting agents (filtered by what's typed
// since the "@"); selecting one inserts "@AgentName " in place of the
// partial query. Mirrors the useSplitRail/useWindowDock shape loosely —
// plain state + a few pure handlers, no external DnD/combobox library.
export function useMentionPicker(value: string, onChange: (value: string) => void, agents: Agent[]) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const mention = findActiveMention(value, cursor);

  const matches = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.toLowerCase();
    return agents.filter((agent) => agent.name.toLowerCase().startsWith(query));
  }, [mention, agents]);

  const isOpen = mention !== null && matches.length > 0 && !isDismissed;
  const safeActiveIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));

  function selectAgent(agent: Agent) {
    if (!mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const next = `${before}@${agent.name} ${after}`;
    onChange(next);
    const nextCursor = before.length + agent.name.length + 2;
    setCursor(nextCursor);
    setIsDismissed(false);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
    setCursor(event.target.selectionStart ?? event.target.value.length);
    setIsDismissed(false);
    setActiveIndex(0);
  }

  // Returns true when it handled the key (caller should skip its own
  // Enter-to-send handling for that keystroke).
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!isOpen) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + matches.length) % matches.length);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectAgent(matches[safeActiveIndex]);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsDismissed(true);
      return true;
    }
    return false;
  }

  return {
    textareaRef,
    isOpen,
    matches,
    activeIndex: safeActiveIndex,
    selectAgent,
    handleChange,
    handleKeyDown,
  };
}
