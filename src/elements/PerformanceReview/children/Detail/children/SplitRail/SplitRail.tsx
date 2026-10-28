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
// Detail.script.ts / wiki.md for the model this renders. The drop target is
// resolved from which half of the hovered slot the pointer is over, so an
// item can land either before OR after any slot — including after the line,
// which is what actually creates the split.
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
      onMove(dragIndex, isAfter ? targetIndex + 1 : targetIndex);
    }
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
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={() => setDragIndex(null)}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Drag to split"
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
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, index)}
            onDragEnd={() => setDragIndex(null)}
          />
        );
      })}
    </div>
  );
}
