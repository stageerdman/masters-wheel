import { useState } from "react";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";

export type RailSlot = ContentKind | "line";

const INITIAL_ORDER: RailSlot[] = ["main", "transcript", "notes", "lessons", "line"];

function moveSlot(order: RailSlot[], fromIndex: number, toIndex: number): RailSlot[] {
  if (fromIndex === toIndex) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(adjustedTo, 0, moved);
  return next;
}

// One ordered list holds the 4 bookmarks plus a "line" sentinel. Whatever
// sits before the line is the top group, whatever sits after is the bottom
// group — dragging a bookmark (or the line itself) is just a reorder of
// this one list. See wiki.md for why.
export function useSplitRail() {
  const [order, setOrder] = useState<RailSlot[]>(INITIAL_ORDER);
  const [activeTop, setActiveTop] = useState<ContentKind>("main");
  const [activeBottom, setActiveBottom] = useState<ContentKind | null>(null);

  const lineIndex = order.indexOf("line");
  const topKinds = order.slice(0, lineIndex) as ContentKind[];
  const bottomKinds = order.slice(lineIndex + 1) as ContentKind[];
  const isSplit = bottomKinds.length > 0;

  const resolvedTop = topKinds.includes(activeTop) ? activeTop : topKinds[0];
  const resolvedBottom = isSplit
    ? activeBottom && bottomKinds.includes(activeBottom)
      ? activeBottom
      : bottomKinds[0]
    : null;

  function moveTo(fromIndex: number, toIndex: number) {
    setOrder((prev) => moveSlot(prev, fromIndex, toIndex));
  }

  return {
    order,
    topKinds,
    bottomKinds,
    isSplit,
    activeTop: resolvedTop,
    activeBottom: resolvedBottom,
    moveTo,
    selectTop: setActiveTop,
    selectBottom: setActiveBottom,
  };
}
