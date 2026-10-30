import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";

const ALL_KINDS: ContentKind[] = ["ai", "transcript", "notes", "lessons"];

type DragInfo = {
  startY: number;
  startLinePx: number;
  railHeight: number;
};

// The split layout (where the line sits, what's pinned below it, which top
// tab is active) is a UI preference, not per-record data — it persists
// across reloads the same way AIAssistant's dock presets do (see
// AIAssistant.windowDock.script.ts), shared across every record rather
// than reset each time you switch or reopen one.
const SPLIT_STORAGE_KEY = "performance-review-detail-split";

type PersistedSplit = {
  linePx: number | null;
  bottomKind: ContentKind | null;
  activeTop: ContentKind;
};

function isContentKind(value: unknown): value is ContentKind {
  return typeof value === "string" && (ALL_KINDS as string[]).includes(value);
}

function loadSplitState(): PersistedSplit | null {
  try {
    const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      linePx: typeof parsed.linePx === "number" ? parsed.linePx : null,
      bottomKind: isContentKind(parsed.bottomKind) ? parsed.bottomKind : null,
      activeTop: isContentKind(parsed.activeTop) ? parsed.activeTop : "ai",
    };
  } catch {
    // Storage unavailable or malformed — fall back to the built-in defaults.
  }
  return null;
}

function saveSplitState(state: PersistedSplit) {
  try {
    localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled (e.g. private browsing) — the layout just won't persist.
  }
}

// One rail spans the Detail column's full height. The 4 bookmarks are
// pinned at its top; the line is a second, fully independent piece of
// state — a continuous pixel offset draggable across that whole height,
// not just the badge cluster. Dragging a bookmark past wherever the line
// currently sits attaches it there (the split); dragging it back above
// detaches it. See wiki.md for the full reasoning and what this replaced.
export function useSplitRail() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [linePx, setLinePx] = useState<number | null>(null); // null = resting at the very bottom (unsplit)
  const [bottomKind, setBottomKind] = useState<ContentKind | null>(null);
  const [activeTop, setActiveTop] = useState<ContentKind>("ai");
  const [dragOffset, setDragOffset] = useState<{ kind: ContentKind; offsetY: number } | null>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate the persisted split layout on mount — a one-time read from a
  // non-reactive external store, not the cascading-update pattern this
  // rule otherwise guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadSplitState();
    if (saved) {
      setLinePx(saved.linePx);
      setBottomKind(saved.bottomKind);
      setActiveTop(saved.activeTop);
    }
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist whenever the layout changes, gated on hydration having
  // finished so the initial default state doesn't overwrite a saved
  // layout before it's had a chance to load.
  useEffect(() => {
    if (!isHydrated) return;
    saveSplitState({ linePx, bottomKind, activeTop });
  }, [isHydrated, linePx, bottomKind, activeTop]);

  const topKinds = ALL_KINDS.filter((kind) => kind !== bottomKind);
  const isSplit = bottomKind !== null;
  const resolvedTop = topKinds.includes(activeTop) ? activeTop : topKinds[0];

  function beginLineDrag(event: ReactPointerEvent) {
    event.preventDefault();
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const startLinePx = linePx ?? rect.height;
    dragRef.current = { startY: event.clientY, startLinePx, railHeight: rect.height };

    function handleMove(moveEvent: PointerEvent) {
      if (!dragRef.current) return;
      const delta = moveEvent.clientY - dragRef.current.startY;
      const next = Math.min(dragRef.current.railHeight, Math.max(0, dragRef.current.startLinePx + delta));
      setLinePx(next);
    }

    function handleUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function beginBadgeDrag(event: ReactPointerEvent, kind: ContentKind) {
    event.preventDefault();
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const threshold = linePx ?? rect.height;
    dragRef.current = { startY: event.clientY, startLinePx: threshold, railHeight: rect.height };
    setDragOffset({ kind, offsetY: 0 });

    function handleMove(moveEvent: PointerEvent) {
      if (!dragRef.current) return;
      setDragOffset({ kind, offsetY: moveEvent.clientY - dragRef.current.startY });
    }

    function handleUp(upEvent: PointerEvent) {
      const rail2 = railRef.current;
      if (dragRef.current && rail2) {
        const railRect = rail2.getBoundingClientRect();
        const cursorY = upEvent.clientY - railRect.top;
        if (cursorY > dragRef.current.startLinePx) {
          setBottomKind(kind);
          setLinePx(dragRef.current.startLinePx);
        } else if (bottomKind === kind) {
          setBottomKind(null);
        }
      }
      dragRef.current = null;
      setDragOffset(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return {
    railRef,
    linePx,
    topKinds,
    bottomKind,
    isSplit,
    activeTop: resolvedTop,
    selectTop: setActiveTop,
    beginLineDrag,
    beginBadgeDrag,
    dragOffset,
  };
}
