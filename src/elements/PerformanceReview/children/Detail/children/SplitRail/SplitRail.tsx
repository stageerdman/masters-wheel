"use client";

import type { RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BookmarkBadge, type ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import position from "./SplitRail.position.module.css";
import styles from "./SplitRail.styles.module.css";

const ATTACH_GAP = 8;

type SplitRailProps = {
  railRef: RefObject<HTMLDivElement | null>;
  linePx: number | null;
  topKinds: ContentKind[];
  bottomKind: ContentKind | null;
  activeTop: ContentKind;
  onSelectTop: (kind: ContentKind) => void;
  onLinePointerDown: (event: ReactPointerEvent) => void;
  onBadgePointerDown: (event: ReactPointerEvent, kind: ContentKind) => void;
  dragOffset: { kind: ContentKind; offsetY: number } | null;
};

// One rail, full column height. Bookmarks are pinned at the top; the line
// is an independent, continuously-draggable divider spanning the whole
// rail. Dragging a bookmark past the line's current position attaches it
// there (creating the split); dragging it back above detaches it. See
// Detail.script.ts for the state machine this renders.
export function SplitRail({
  railRef,
  linePx,
  topKinds,
  bottomKind,
  activeTop,
  onSelectTop,
  onLinePointerDown,
  onBadgePointerDown,
  dragOffset,
}: SplitRailProps) {
  function transformFor(kind: ContentKind) {
    return dragOffset && dragOffset.kind === kind ? `translateY(${dragOffset.offsetY}px)` : undefined;
  }

  return (
    <div ref={railRef} className={`${styles.root} ${position.root}`}>
      <div className={position.topStack}>
        {topKinds.map((kind) => (
          <div key={kind} style={{ transform: transformFor(kind) }}>
            <BookmarkBadge
              kind={kind}
              active={kind === activeTop}
              onClick={() => onSelectTop(kind)}
              onPointerDown={(event) => onBadgePointerDown(event, kind)}
            />
          </div>
        ))}
      </div>

      <div
        className={`${styles.line} ${position.line}`}
        style={linePx === null ? { bottom: 0 } : { top: linePx }}
        onPointerDown={onLinePointerDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag to split"
      />

      {bottomKind && linePx !== null && (
        <div
          className={position.attached}
          style={{ top: linePx + ATTACH_GAP, transform: transformFor(bottomKind) }}
        >
          <BookmarkBadge
            kind={bottomKind}
            active
            onClick={() => {}}
            onPointerDown={(event) => onBadgePointerDown(event, bottomKind)}
          />
        </div>
      )}
    </div>
  );
}
