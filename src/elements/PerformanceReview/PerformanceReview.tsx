"use client";

import { useState } from "react";
import { FAKE_VIDEOS } from "./PerformanceReview.data";
import { Navigation } from "./children/Navigation/Navigation";
import { Hero } from "./children/Hero/Hero";
import { Detail } from "./children/Detail/Detail";
import position from "./PerformanceReview.position.module.css";
import styles from "./PerformanceReview.styles.module.css";

type Edits = Record<string, { notes: string; lessons: string }>;

export function PerformanceReview() {
  const [selectedId, setSelectedId] = useState(FAKE_VIDEOS[0].id);
  const [edits, setEdits] = useState<Edits>({});

  const selected =
    FAKE_VIDEOS.find((video) => video.id === selectedId) ?? FAKE_VIDEOS[0];
  const notes = edits[selected.id]?.notes ?? selected.notes;
  const lessons = edits[selected.id]?.lessons ?? selected.lessons;

  function updateNotes(value: string) {
    setEdits((prev) => ({
      ...prev,
      [selected.id]: { notes: value, lessons: prev[selected.id]?.lessons ?? selected.lessons },
    }));
  }

  function updateLessons(value: string) {
    setEdits((prev) => ({
      ...prev,
      [selected.id]: { lessons: value, notes: prev[selected.id]?.notes ?? selected.notes },
    }));
  }

  return (
    <div className={`${styles.root} ${position.root}`}>
      <Navigation videos={FAKE_VIDEOS} selectedId={selected.id} onSelect={setSelectedId} />
      <Hero video={selected} notes={notes} lessons={lessons} onNotesChange={updateNotes} onLessonsChange={updateLessons} />
      <Detail video={selected} notes={notes} lessons={lessons} onNotesChange={updateNotes} onLessonsChange={updateLessons} />
    </div>
  );
}
