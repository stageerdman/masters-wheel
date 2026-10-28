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
  const { order, isSplit, activeTop, activeBottom, moveTo, selectTop, selectBottom } = useSplitRail();

  return (
    <aside className={`${styles.root} ${position.root}`}>
      <div className={position.panes}>
        <div className={position.pane}>
          <TextView
            kind={activeTop}
            video={video}
            notes={notes}
            lessons={lessons}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
          />
        </div>
        {isSplit && activeBottom && (
          <>
            <div className={`${styles.divider} ${position.divider}`} aria-hidden="true" />
            <div className={position.pane}>
              <TextView
                kind={activeBottom}
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
      <div className={position.railSlot}>
        <SplitRail
          order={order}
          activeTop={activeTop}
          activeBottom={activeBottom}
          onSelectTop={selectTop}
          onSelectBottom={selectBottom}
          onMove={moveTo}
        />
      </div>
    </aside>
  );
}
