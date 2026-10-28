"use client";

import { useState } from "react";
import { MediaPlayer } from "@/elements/MediaPlayer/MediaPlayer";
import { BookmarkRail } from "@/elements/BookmarkRail/BookmarkRail";
import { TextView } from "@/elements/TextView/TextView";
import type { ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import position from "./Hero.position.module.css";
import styles from "./Hero.styles.module.css";

type HeroProps = {
  video: VideoRecord;
  notes: string;
  lessons: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
};

export function Hero({ video, notes, lessons, onNotesChange, onLessonsChange }: HeroProps) {
  const [active, setActive] = useState<ContentKind>("main");

  return (
    <section className={`${styles.root} ${position.root}`}>
      <h1 className={`${styles.title} ${position.title}`}>{video.title}</h1>
      <div className={position.mediaSlot}>
        <MediaPlayer title={video.title} />
      </div>
      <div className={position.railSlot}>
        <BookmarkRail active={active} onSelect={setActive} />
      </div>
      <div className={position.textSlot}>
        <TextView
          kind={active}
          video={video}
          notes={notes}
          lessons={lessons}
          onNotesChange={onNotesChange}
          onLessonsChange={onLessonsChange}
        />
      </div>
    </section>
  );
}
