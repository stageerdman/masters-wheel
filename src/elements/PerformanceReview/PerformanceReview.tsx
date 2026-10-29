"use client";

import { useEffect, useRef } from "react";
import { useHeaderActions, type HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import { TranscriptUploadModal } from "@/elements/TranscriptUploadModal/TranscriptUploadModal";
import { CALL_STATE_META, CALL_STATE_ORDER, type CallState } from "./PerformanceReview.data";
import { usePerformanceReviewData, useRecordDrop, useTranscriptDrop } from "./PerformanceReview.script";
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
  description: CALL_STATE_META[id].description,
}));

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    toggleReviewed,
    addRecordsFromPaths,
    isTranscriptUploadOpen,
    transcriptUploadError,
    openTranscriptUpload,
    closeTranscriptUpload,
    importTranscript,
    renameTranscriptSpeaker,
  } = usePerformanceReviewData();

  const videoRef = useRef<HTMLVideoElement>(null);

  function seekTranscript(seconds: number) {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = seconds;
    videoEl.play();
  }

  // Mutually exclusive: the video drop handler is disabled while the
  // transcript upload modal owns window-level drops, and vice versa — see
  // PerformanceReview.script.ts.
  const isDragActive = useRecordDrop(addRecordsFromPaths, !isTranscriptUploadOpen);
  const isTranscriptDragActive = useTranscriptDrop(importTranscript, isTranscriptUploadOpen);

  useEffect(() => {
    setIsland({
      stateOptions: STATE_OPTIONS,
      activeStateId: selected?.state ?? null,
      onStateChange: (id) => {
        updateMetaField("state", id as CallState);
        // Auto-fill the closed date the moment a call first becomes
        // closed; never overwrite a date the user already set manually.
        if (id === "closed" && !selected?.closedDate) {
          updateMetaField("closedDate", todayIso());
        }
      },
      reviewed: selected?.reviewed ?? false,
      onToggleReviewed: toggleReviewed,
    });
    return () => setIsland(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.state, selected?.closedDate, selected?.reviewed]);

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
            videoRef={videoRef}
            notes={selected.notes}
            lessons={selected.lessons}
            aiAnalysis={selected.aiAnalysis}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
            onAiAnalysisChange={onAiAnalysisChange}
            onOfferedAmountChange={(value) => updateMetaField("offeredAmount", value)}
            onOfferedCurrencyChange={(value) => updateMetaField("offeredCurrency", value)}
            onDescriptionChange={(value) => updateMetaField("description", value)}
            onDateChange={(value) => updateMetaField("date", value)}
            onClosedDateChange={(value) => updateMetaField("closedDate", value)}
            onTitleChange={(value) => updateMetaField("title", value)}
            onRequestTranscriptUpload={openTranscriptUpload}
            onSeekTranscript={seekTranscript}
            onRenameTranscriptSpeaker={renameTranscriptSpeaker}
          />
          <Detail
            video={selected}
            notes={selected.notes}
            lessons={selected.lessons}
            aiAnalysis={selected.aiAnalysis}
            onNotesChange={onNotesChange}
            onLessonsChange={onLessonsChange}
            onAiAnalysisChange={onAiAnalysisChange}
            onRequestTranscriptUpload={openTranscriptUpload}
            onSeekTranscript={seekTranscript}
            onRenameTranscriptSpeaker={renameTranscriptSpeaker}
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
      <TranscriptUploadModal
        isOpen={isTranscriptUploadOpen}
        isDragActive={isTranscriptDragActive}
        error={transcriptUploadError}
        onFileSelected={importTranscript}
        onClose={closeTranscriptUpload}
      />
    </div>
  );
}
