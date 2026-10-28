import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";

const BADGE_SIZE = 28;
const GAP = 8;
const SLOT = BADGE_SIZE + GAP;

const INITIAL_ORDER: ContentKind[] = ["main", "transcript", "notes", "lessons"];

function reorder(order: ContentKind[], fromIndex: number, insertAt: number): ContentKind[] {
  if (fromIndex === insertAt) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  const adjusted = fromIndex < insertAt ? insertAt - 1 : insertAt;
  next.splice(adjusted, 0, moved);
  return next;
}

// The 4 bookmarks live in their own reorderable list (drag badge-to-badge,
// never touched by the line). The line is a second, independent piece of
// state: a continuous pixel offset, dragged with real-time pointer tracking
// and clamped to the badge stack's height — it can rest almost anywhere,
// not just snapped between slots. Whichever badges currently sit above the
// line's pixel position (by their fixed slot geometry) are the top group;
// the rest are the bottom group. See wiki.md for why this replaced the
// earlier single-shared-list model.
export function useSplitRail() {
  const [order, setOrder] = useState<ContentKind[]>(INITIAL_ORDER);
  const [linePx, setLinePx] = useState<number | null>(null);
  const [activeTop, setActiveTop] = useState<ContentKind>("main");
  const [activeBottom, setActiveBottom] = useState<ContentKind | null>(null);
  const dragRef = useRef<{ startY: number; startLinePx: number } | null>(null);

  const trackHeight = order.length * SLOT - GAP;
  const resolvedLinePx = linePx === null ? trackHeight : linePx;

  let splitIndex = order.length;
  for (let i = 0; i < order.length; i += 1) {
    const slotCenter = i * SLOT + BADGE_SIZE / 2;
    if (slotCenter >= resolvedLinePx) {
      splitIndex = i;
      break;
    }
  }

  const topKinds = order.slice(0, splitIndex);
  const bottomKinds = order.slice(splitIndex);
  const isSplit = bottomKinds.length > 0;

  const resolvedTop = topKinds.includes(activeTop) ? activeTop : topKinds[0];
  const resolvedBottom = isSplit
    ? activeBottom && bottomKinds.includes(activeBottom)
      ? activeBottom
      : bottomKinds[0]
    : null;

  const handleLinePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      dragRef.current = { startY: event.clientY, startLinePx: resolvedLinePx };

      function handleMove(moveEvent: PointerEvent) {
        if (!dragRef.current) return;
        const delta = moveEvent.clientY - dragRef.current.startY;
        const next = Math.min(trackHeight, Math.max(0, dragRef.current.startLinePx + delta));
        setLinePx(next);
      }

      function handleUp() {
        dragRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [resolvedLinePx, trackHeight]
  );

  function reorderTo(fromIndex: number, insertAt: number) {
    setOrder((prev) => reorder(prev, fromIndex, insertAt));
  }

  return {
    order,
    trackHeight,
    linePx: resolvedLinePx,
    topKinds,
    bottomKinds,
    isSplit,
    activeTop: resolvedTop,
    activeBottom: resolvedBottom,
    selectTop: setActiveTop,
    selectBottom: setActiveBottom,
    reorderTo,
    handleLinePointerDown,
  };
}
