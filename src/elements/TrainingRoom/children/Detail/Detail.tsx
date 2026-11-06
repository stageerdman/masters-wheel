"use client";

import { SplitRail } from "@/elements/SplitRail/SplitRail";
import { useSplitRail } from "@/lib/splitRail";
import { DETAIL_CONTENT_KIND_META, DETAIL_CONTENT_KIND_ORDER } from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./Detail.position.module.css";
import styles from "./Detail.styles.module.css";

type DetailProps = {
  sessionId: string;
  notes: string;
  onNotesChange: (value: string) => void;
};

// Same drag-to-split mechanism as Performance Review's Detail, seeded
// with a single "notes" kind for now — see TrainingRoom.data.ts and this
// update's wiki.md for why. Each session gets its own persisted split
// layout, keyed by session id.
export function Detail({ sessionId, notes, onNotesChange }: DetailProps) {
  const { railRef, linePx, topKinds, bottomKind, isSplit, activeTop, beginLineDrag, beginBadgeDrag, dragOffset } =
    useSplitRail(DETAIL_CONTENT_KIND_ORDER, `training-room-detail-split-${sessionId}`);

  return (
    <aside className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.panes} data-construction>
        <div className={position.pane} data-construction>
          {activeTop === "notes" && (
            <textarea
              className={`${styles.editableText} ${position.editableText}`}
              data-construction
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Notes"
            />
          )}
        </div>
        {isSplit && bottomKind && (
          <>
            <div className={`${styles.divider} ${position.divider}`} data-construction aria-hidden="true" />
            <div className={position.pane} data-construction />
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
          onSelectTop={() => {}}
          onLinePointerDown={beginLineDrag}
          onBadgePointerDown={beginBadgeDrag}
          dragOffset={dragOffset}
        />
      </div>
    </aside>
  );
}
