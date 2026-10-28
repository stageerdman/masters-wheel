import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";

const ALL_KINDS: ContentKind[] = ["main", "transcript", "notes", "lessons"];

type DragInfo = {
  startY: number;
  startLinePx: number;
  railHeight: number;
};

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
  const [activeTop, setActiveTop] = useState<ContentKind>("main");
  const [dragOffset, setDragOffset] = useState<{ kind: ContentKind; offsetY: number } | null>(null);
  const dragRef = useRef<DragInfo | null>(null);

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
