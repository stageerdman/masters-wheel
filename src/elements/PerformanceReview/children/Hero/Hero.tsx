"use client";

import { useState } from "react";
import { MediaPlayer } from "@/elements/MediaPlayer/MediaPlayer";
import { BookmarkRail } from "@/elements/BookmarkRail/BookmarkRail";
import { TextView } from "@/elements/TextView/TextView";
import { MetaPanel } from "./children/MetaPanel/MetaPanel";
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
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
};

export function Hero({
  video,
  notes,
  lessons,
  onNotesChange,
  onLessonsChange,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
}: HeroProps) {
  const [active, setActive] = useState<ContentKind>("main");

  return (
    <section className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.titleBlock} data-construction>
        <h1 className={styles.title} data-construction>
          {video.title}
        </h1>
        <MetaPanel
          offeredAmount={video.offeredAmount}
          offeredCurrency={video.offeredCurrency}
          description={video.description}
          onOfferedAmountChange={onOfferedAmountChange}
          onOfferedCurrencyChange={onOfferedCurrencyChange}
          onDescriptionChange={onDescriptionChange}
        />
      </div>
      <div className={position.mediaSlot} data-construction>
        <MediaPlayer title={video.title} />
      </div>
      <div className={position.railSlot} data-construction>
        <BookmarkRail active={active} onSelect={setActive} />
      </div>
      <div className={position.textSlot} data-construction>
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
