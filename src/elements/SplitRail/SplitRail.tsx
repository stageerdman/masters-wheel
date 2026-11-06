"use client";

import type { RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BookmarkBadge, type BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";
import position from "./SplitRail.position.module.css";
import styles from "./SplitRail.styles.module.css";

const ATTACH_GAP = 8;

type SplitRailProps<K extends string> = {
  railRef: RefObject<HTMLDivElement | null>;
  metaFor: (kind: K) => BookmarkMeta;
  linePx: number | null;
  topKinds: K[];
  bottomKind: K | null;
  activeTop: K;
  onSelectTop: (kind: K) => void;
  onLinePointerDown: (event: ReactPointerEvent) => void;
  onBadgePointerDown: (event: ReactPointerEvent, kind: K) => void;
  dragOffset: { kind: K; offsetY: number } | null;
};

// One rail, full column height. Bookmarks are pinned at the top; the line
// is an independent, continuously-draggable divider spanning the whole
// rail. Dragging a bookmark past the line's current position attaches it
// there (creating the split); dragging it back above detaches it. Generic
// over whatever kind set the caller passes in (see src/lib/splitRail.ts
// for the state machine this renders) — Performance Review's Detail and
// Training Room's Detail each seed it with their own kinds/meta.
export function SplitRail<K extends string>({
  railRef,
  metaFor,
  linePx,
  topKinds,
  bottomKind,
  activeTop,
  onSelectTop,
  onLinePointerDown,
  onBadgePointerDown,
  dragOffset,
}: SplitRailProps<K>) {
  function transformFor(kind: K) {
    return dragOffset && dragOffset.kind === kind ? `translateY(${dragOffset.offsetY}px)` : undefined;
  }

  return (
    <div ref={railRef} className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.topStack} data-construction>
        {topKinds.map((kind) => (
          <div key={kind} style={{ transform: transformFor(kind) }}>
            <BookmarkBadge
              kind={kind}
              meta={metaFor(kind)}
              active={kind === activeTop}
              onClick={() => onSelectTop(kind)}
              onPointerDown={(event) => onBadgePointerDown(event, kind)}
            />
          </div>
        ))}
      </div>

      <div
        className={`${styles.line} ${position.line}`}
        data-construction
        style={linePx === null ? { bottom: 0 } : { top: linePx }}
        onPointerDown={onLinePointerDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag to split"
      />

      {bottomKind && linePx !== null && (
        <div
          className={position.attached}
          data-construction
          style={{ top: linePx + ATTACH_GAP, transform: transformFor(bottomKind) }}
        >
          <BookmarkBadge
            kind={bottomKind}
            meta={metaFor(bottomKind)}
            active
            onClick={() => {}}
            onPointerDown={(event) => onBadgePointerDown(event, bottomKind)}
          />
        </div>
      )}
    </div>
  );
}
