import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

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

function defaultMatch(name: string, query: string) {
  return name.toLowerCase().startsWith(query.toLowerCase());
}

// Generic "@mention" state machine, shared by anything that lets you
// reference a named item inline in free text (the AI Assistant's chat
// Composer referencing agents, the Agents editor's Instructions field
// referencing knowledge files). Typing "@" opens a picker filtered by
// what's typed since the "@"; selecting an item inserts "@Name " in place
// of the partial query. Only ever touches items through `.name`, so it's
// generic over whatever shape of item has one.
export function useMentionPicker<T extends { name: string }>(
  value: string,
  onChange: (value: string) => void,
  items: T[],
  match: (item: T, query: string) => boolean = (item, query) => defaultMatch(item.name, query),
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const mention = findActiveMention(value, cursor);

  const matches = useMemo(() => {
    if (!mention) return [];
    return items.filter((item) => match(item, mention.query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mention, items]);

  const isOpen = mention !== null && matches.length > 0 && !isDismissed;
  const safeActiveIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));

  function selectItem(item: T) {
    if (!mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const next = `${before}@${item.name} ${after}`;
    onChange(next);
    const nextCursor = before.length + item.name.length + 2;
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
  // handling, e.g. Enter-to-send, for that keystroke).
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
      selectItem(matches[safeActiveIndex]);
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
    mentionQuery: mention?.query ?? null,
    selectItem,
    handleChange,
    handleKeyDown,
  };
}
