"use client";

import { useState, type DragEvent } from "react";
import { BookmarkBadge, type ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { RailSlot } from "../../Detail.script";
import position from "./SplitRail.position.module.css";
import styles from "./SplitRail.styles.module.css";

type SplitRailProps = {
  order: RailSlot[];
  activeTop: ContentKind;
  activeBottom: ContentKind | null;
  onSelectTop: (kind: ContentKind) => void;
  onSelectBottom: (kind: ContentKind) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

// Drag-reorderable rail: one ordered list of 4 bookmarks + a "line". See
// Detail.script.ts / wiki.md for the model this renders.
export function SplitRail({
  order,
  activeTop,
  activeBottom,
  onSelectTop,
  onSelectBottom,
  onMove,
}: SplitRailProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const lineIndex = order.indexOf("line");

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleDrop(index: number) {
    if (dragIndex !== null) onMove(dragIndex, index);
    setDragIndex(null);
  }

  return (
    <div className={`${styles.root} ${position.root}`}>
      {order.map((slot, index) => {
        if (slot === "line") {
          return (
            <div
              key="line"
              className={`${styles.line} ${position.line} ${dragIndex === index ? styles.dragging : ""}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragIndex(null)}
              aria-hidden="true"
            />
          );
        }

        const isTop = index < lineIndex;
        const active = isTop ? slot === activeTop : slot === activeBottom;

        return (
          <BookmarkBadge
            key={slot}
            kind={slot}
            active={active}
            onClick={() => (isTop ? onSelectTop(slot) : onSelectBottom(slot))}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
          />
        );
      })}
    </div>
  );
}
