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
  heroSrc: string | null;
  notes: string;
  lessons: string;
  aiAnalysis: string;
  onNotesChange: (value: string) => void;
  onLessonsChange: (value: string) => void;
  onAiAnalysisChange: (value: string) => void;
  onOfferedAmountChange: (value: number | null) => void;
  onOfferedCurrencyChange: (value: string | null) => void;
  onDescriptionChange: (value: string) => void;
};

export function Hero({
  video,
  heroSrc,
  notes,
  lessons,
  aiAnalysis,
  onNotesChange,
  onLessonsChange,
  onAiAnalysisChange,
  onOfferedAmountChange,
  onOfferedCurrencyChange,
  onDescriptionChange,
}: HeroProps) {
  const [active, setActive] = useState<ContentKind>("ai");

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
        <MediaPlayer title={video.title} src={heroSrc} />
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
          aiAnalysis={aiAnalysis}
          onNotesChange={onNotesChange}
          onLessonsChange={onLessonsChange}
          onAiAnalysisChange={onAiAnalysisChange}
        />
      </div>
    </section>
  );
}
