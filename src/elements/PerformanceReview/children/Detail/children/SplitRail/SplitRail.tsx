"use client";

import { useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BookmarkBadge, type ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import position from "./SplitRail.position.module.css";
import styles from "./SplitRail.styles.module.css";

type SplitRailProps = {
  order: ContentKind[];
  trackHeight: number;
  linePx: number;
  topKinds: ContentKind[];
  activeTop: ContentKind;
  activeBottom: ContentKind | null;
  onSelectTop: (kind: ContentKind) => void;
  onSelectBottom: (kind: ContentKind) => void;
  onReorder: (fromIndex: number, insertAt: number) => void;
  onLinePointerDown: (event: ReactPointerEvent) => void;
};

// Badges reorder among themselves via HTML5 drag-and-drop (before/after
// resolved from which half of the hovered badge the pointer is over). The
// line is a separate, continuously pointer-dragged divider — see
// Detail.script.ts for why the two are kept independent.
export function SplitRail({
  order,
  trackHeight,
  linePx,
  topKinds,
  activeTop,
  activeBottom,
  onSelectTop,
  onSelectBottom,
  onReorder,
  onLinePointerDown,
}: SplitRailProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, index: number) {
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault();
    if (dragIndex !== null) {
      const rect = event.currentTarget.getBoundingClientRect();
      const isAfter = event.clientY > rect.top + rect.height / 2;
      onReorder(dragIndex, isAfter ? targetIndex + 1 : targetIndex);
    }
    setDragIndex(null);
  }

  return (
    <div className={`${styles.root} ${position.root}`} style={{ height: trackHeight }}>
      <div className={position.stack}>
        {order.map((kind, index) => {
          const isTop = topKinds.includes(kind);
          const active = isTop ? kind === activeTop : kind === activeBottom;
          return (
            <BookmarkBadge
              key={kind}
              kind={kind}
              active={active}
              onClick={() => (isTop ? onSelectTop(kind) : onSelectBottom(kind))}
              draggable
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={() => setDragIndex(null)}
            />
          );
        })}
      </div>
      <div
        className={`${styles.line} ${position.line}`}
        style={{ top: linePx }}
        onPointerDown={onLinePointerDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag to split"
      />
    </div>
  );
}
