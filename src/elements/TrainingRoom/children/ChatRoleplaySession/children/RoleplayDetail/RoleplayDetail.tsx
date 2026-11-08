"use client";

import { SplitRail } from "@/elements/SplitRail/SplitRail";
import { useSplitRail } from "@/lib/splitRail";
import {
  CHAT_ROLEPLAY_DETAIL_KIND_ORDER,
  DETAIL_CONTENT_KIND_META,
  type DetailContentKind,
} from "@/elements/TrainingRoom/TrainingRoom.data";
import { AITrainerPane } from "./children/AITrainerPane/AITrainerPane";
import position from "./RoleplayDetail.position.module.css";
import styles from "./RoleplayDetail.styles.module.css";

type RoleplayDetailProps = {
  sessionId: string;
  notes: string;
  onNotesChange: (value: string) => void;
};

// Same drag-to-split SplitRail/useSplitRail primitive every other Detail
// column in the app uses (Performance Review, Training Room's own
// Voice Training Detail) — AI Trainer and Notes are just a second real
// kind set (CHAT_ROLEPLAY_DETAIL_KIND_ORDER), not a bespoke layout
// mechanism. Starts unsplit (AI Trainer shown alone, the first kind in
// that order) — clicking or dragging the "NT" badge down splits it,
// exactly the same gesture as everywhere else in the app.
export function RoleplayDetail({ sessionId, notes, onNotesChange }: RoleplayDetailProps) {
  const { railRef, linePx, topKinds, bottomKind, isSplit, activeTop, selectTop, beginLineDrag, beginBadgeDrag, dragOffset } =
    useSplitRail(CHAT_ROLEPLAY_DETAIL_KIND_ORDER, `chat-roleplay-detail-split-${sessionId}`);

  function renderKind(kind: DetailContentKind) {
    if (kind === "trainer") return <AITrainerPane />;
    return (
      <textarea
        className={`${styles.editableText} ${position.editableText}`}
        data-construction
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notes — private. Never seen by the AI Trainer or the roleplay AI."
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
          {renderKind(activeTop)}
        </div>
        {isSplit && bottomKind && (
          <>
            <div className={`${styles.divider} ${position.divider}`} data-construction aria-hidden="true" />
            <div className={position.pane} data-construction>
              {renderKind(bottomKind)}
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
