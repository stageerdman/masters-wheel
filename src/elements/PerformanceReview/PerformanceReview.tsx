"use client";

import { useEffect, useState } from "react";
import { useHeaderActions, type HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import {
  CALL_STATE_META,
  CALL_STATE_ORDER,
  FAKE_VIDEOS,
  type CallState,
} from "./PerformanceReview.data";
import { Navigation } from "./children/Navigation/Navigation";
import { Hero } from "./children/Hero/Hero";
import { Detail } from "./children/Detail/Detail";
import position from "./PerformanceReview.position.module.css";
import styles from "./PerformanceReview.styles.module.css";

type EditableFields = {
  notes: string;
  lessons: string;
  state: CallState;
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
};

type Edits = Record<string, Partial<EditableFields>>;

const STATE_OPTIONS: HeaderIslandOption[] = CALL_STATE_ORDER.map((id) => ({
  id,
  glyph: CALL_STATE_META[id].glyph,
  color: CALL_STATE_META[id].color,
  label: CALL_STATE_META[id].label,
}));

export function PerformanceReview() {
  const { setIsland, setBrand } = useHeaderActions();
  const [selectedId, setSelectedId] = useState(FAKE_VIDEOS[0].id);
  const [edits, setEdits] = useState<Edits>({});

  const videos = FAKE_VIDEOS.map((video) => ({ ...video, ...edits[video.id] }));
  const selected = videos.find((video) => video.id === selectedId) ?? videos[0];

  function updateField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setEdits((prev) => ({
      ...prev,
      [selected.id]: { ...prev[selected.id], [key]: value },
    }));
  }

  useEffect(() => {
    setIsland({
      stateOptions: STATE_OPTIONS,
      activeStateId: selected.state,
      onStateChange: (id) => updateField("state", id as CallState),
    });
    return () => setIsland(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.id, selected.state]);

  useEffect(() => {
    setBrand({ label: "Performance Review", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <Navigation videos={videos} selectedId={selected.id} onSelect={setSelectedId} />
      <Hero
        video={selected}
        notes={selected.notes}
        lessons={selected.lessons}
        onNotesChange={(value) => updateField("notes", value)}
        onLessonsChange={(value) => updateField("lessons", value)}
        onOfferedAmountChange={(value) => updateField("offeredAmount", value)}
        onOfferedCurrencyChange={(value) => updateField("offeredCurrency", value)}
        onDescriptionChange={(value) => updateField("description", value)}
      />
      <Detail
        video={selected}
        notes={selected.notes}
        lessons={selected.lessons}
        onNotesChange={(value) => updateField("notes", value)}
        onLessonsChange={(value) => updateField("lessons", value)}
      />
    </div>
  );
}
