"use client";

import { SplitRail } from "./children/SplitRail/SplitRail";
import { TextView } from "@/elements/TextView/TextView";
import { useSplitRail } from "./Detail.script";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./Detail.position.module.css";
import styles from "./Detail.styles.module.css";

type DetailProps = {
  video: VideoRecord;
  notes: string;
  lessons: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
};

export function Detail({ video, notes, lessons, onNotesChange, onLessonsChange }: DetailProps) {
  const {
    railRef,
    linePx,
    topKinds,
    bottomKind,
    isSplit,
    activeTop,
    selectTop,
    beginLineDrag,
    beginBadgeDrag,
    dragOffset,
  } = useSplitRail();

  return (
    <aside className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.panes} data-construction>
        <div
          className={position.pane}
          data-construction
          style={isSplit && linePx !== null ? { flex: `0 0 ${linePx}px` } : undefined}
        >
          <TextView
            kind={activeTop}
            video={video}
            notes={notes}
            lessons={lessons}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
          />
        </div>
        {isSplit && bottomKind && (
          <>
            <div
              className={`${styles.divider} ${position.divider}`}
              data-construction
              aria-hidden="true"
            />
            <div className={position.pane} data-construction>
              <TextView
                kind={bottomKind}
                video={video}
                notes={notes}
                lessons={lessons}
                onNotesChange={onNotesChange}
                onLessonsChange={onLessonsChange}
              />
            </div>
          </>
        )}
      </div>
      <div className={position.railSlot} data-construction>
        <SplitRail
          railRef={railRef}
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
