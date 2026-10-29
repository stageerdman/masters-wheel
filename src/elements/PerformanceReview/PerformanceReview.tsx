"use client";

import { useEffect } from "react";
import { useHeaderActions, type HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import { CALL_STATE_META, CALL_STATE_ORDER, type CallState } from "./PerformanceReview.data";
import { usePerformanceReviewData, useRecordDrop } from "./PerformanceReview.script";
import { Navigation } from "./children/Navigation/Navigation";
import { Hero } from "./children/Hero/Hero";
import { Detail } from "./children/Detail/Detail";
import position from "./PerformanceReview.position.module.css";
import styles from "./PerformanceReview.styles.module.css";

const STATE_OPTIONS: HeaderIslandOption[] = CALL_STATE_ORDER.map((id) => ({
  id,
  glyph: CALL_STATE_META[id].glyph,
  color: CALL_STATE_META[id].color,
  label: CALL_STATE_META[id].label,
}));

export function PerformanceReview() {
  const { setIsland, setBrand } = useHeaderActions();
  const {
    videos,
    selected,
    selectedId,
    setSelectedId,
    heroSrc,
    onNotesChange,
    onAiAnalysisChange,
    onLessonsChange,
    updateMetaField,
    addRecordsFromPaths,
  } = usePerformanceReviewData();

  const isDragActive = useRecordDrop(addRecordsFromPaths);

  useEffect(() => {
    setIsland({
      stateOptions: STATE_OPTIONS,
      activeStateId: selected?.state ?? null,
      onStateChange: (id) => updateMetaField("state", id as CallState),
    });
    return () => setIsland(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.state]);

  useEffect(() => {
    setBrand({ label: "Performance Review", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <Navigation
        videos={videos}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAddRecord={addRecordsFromPaths}
      />
      {selected ? (
        <>
          <Hero
            video={selected}
            heroSrc={heroSrc}
            notes={selected.notes}
            lessons={selected.lessons}
            aiAnalysis={selected.aiAnalysis}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
            onAiAnalysisChange={onAiAnalysisChange}
            onOfferedAmountChange={(value) => updateMetaField("offeredAmount", value)}
            onOfferedCurrencyChange={(value) => updateMetaField("offeredCurrency", value)}
            onDescriptionChange={(value) => updateMetaField("description", value)}
          />
          <Detail
            video={selected}
            notes={selected.notes}
            lessons={selected.lessons}
            aiAnalysis={selected.aiAnalysis}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
            onAiAnalysisChange={onAiAnalysisChange}
          />
        </>
      ) : (
        <div className={position.emptyState} data-construction>
          <p className={styles.emptyStateText} data-construction>
            No records yet — add one from the list on the left.
          </p>
        </div>
      )}
      {isDragActive && (
        <div className={`${styles.dropOverlay} ${position.dropOverlay}`} data-construction aria-hidden="true">
          <p className={styles.dropOverlayText} data-construction>
            Drop to add a record
          </p>
        </div>
      )}
    </div>
  );
}
