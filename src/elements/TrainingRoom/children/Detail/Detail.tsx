"use client";

import type { ReactNode } from "react";
import { SplitRail } from "@/elements/SplitRail/SplitRail";
import { useSplitRail } from "@/lib/splitRail";
import {
  DETAIL_CONTENT_KIND_META,
  DETAIL_CONTENT_KIND_ORDER,
  type DetailContentKind,
} from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./Detail.position.module.css";
import styles from "./Detail.styles.module.css";

type DetailProps = {
  sessionId: string;
  notes: string;
  onNotesChange: (value: string) => void;
  // Which kinds this discipline's Detail carries, top first — Voice
  // Training is just Notes; Chat Roleplay pins AI Trainer above it, Frame
  // Drills pins its saved frames above it.
  kindOrder?: DetailContentKind[];
  // Each discipline keeps its own persisted split layout per session.
  storageKey?: string;
  // Renders every non-notes kind; Notes is always this element's own.
  renderKind?: (kind: DetailContentKind) => ReactNode;
  notesPlaceholder?: string;
};

// Training Room's one Detail column — the same drag-to-split
// SplitRail/useSplitRail primitive Performance Review's Detail uses, shared
// by every discipline that has one (was a separate near-identical copy per
// discipline until Frame Drills became the third). Starts unsplit, showing
// the first kind alone; clicking or dragging a lower badge splits it.
export function Detail({
  sessionId,
  notes,
  onNotesChange,
  kindOrder = DETAIL_CONTENT_KIND_ORDER,
  storageKey = `training-room-detail-split-${sessionId}`,
  renderKind,
  notesPlaceholder = "Notes",
}: DetailProps) {
  const { railRef, linePx, topKinds, bottomKind, isSplit, activeTop, selectTop, beginLineDrag, beginBadgeDrag, dragOffset } =
    useSplitRail(kindOrder, storageKey);

  function renderPane(kind: DetailContentKind) {
    if (kind !== "notes") return renderKind?.(kind) ?? null;
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={notesPlaceholder}
      />
    );
  }

  return (
    <aside className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.panes} data-construction>
        <div
          className={position.pane}
          data-construction
          style={isSplit && linePx !== null ? { flex: `0 0 ${linePx}px` } : undefined}
        >
          {renderPane(activeTop)}
        </div>
        {isSplit && bottomKind && (
          <>
            <div className={`${styles.divider} ${position.divider}`} data-construction aria-hidden="true" />
            <div className={position.pane} data-construction>
              {renderPane(bottomKind)}
            </div>
          </>
        )}
      </div>
      <div className={position.railSlot} data-construction>
        <SplitRail
          railRef={railRef}
          metaFor={(kind) => DETAIL_CONTENT_KIND_META[kind]}
          linePx={linePx}
          topKinds={topKinds}
          bottomKind={bottomKind}
          activeTop={activeTop}
          onSelectTop={selectTop}
          onLinePointerDown={beginLineDrag}
          onBadgePointerDown={beginBadgeDrag}
          dragOffset={dragOffset}
        />
      </div>
    </aside>
  );
}
