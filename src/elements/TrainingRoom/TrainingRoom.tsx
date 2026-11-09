"use client";

import { useEffect } from "react";
import { useHeaderActions } from "@/elements/AppHeader/AppHeader.context";
import { VideoUploadModal } from "@/elements/VideoUploadModal/VideoUploadModal";
import { useTrainingRoomData } from "./TrainingRoom.script";
import { Navigation } from "./children/Navigation/Navigation";
import { Hero } from "./children/Hero/Hero";
import { Detail } from "./children/Detail/Detail";
import { DisciplinePicker } from "./children/DisciplinePicker/DisciplinePicker";
import { ChatRoleplaySession } from "./children/ChatRoleplaySession/ChatRoleplaySession";
import { MindsetShiftingChat } from "./children/MindsetShiftingChat/MindsetShiftingChat";
import { LearningHero } from "./children/LearningHero/LearningHero";
import { LearningDetail } from "./children/LearningDetail/LearningDetail";
import position from "./TrainingRoom.position.module.css";
import styles from "./TrainingRoom.styles.module.css";

export function TrainingRoom() {
  const { setBrand } = useHeaderActions();
  const {
    openSessions,
    closedSessions,
    selected,
    selectedId,
    selectSession,
    addSession,
    removeSession,
    closeSession,
    reopenSession,
    renameSession,
    onNotesChange,
    updateRoleplay,
    addClip,
    generateTranscript,
    generationByMedia,
    stopGenerateTranscript,
    retryGenerateTranscript,
    dismissGenerateTranscriptError,
    updateLearningBlockText,
    toggleLearningPin,
    selectLearningFile,
    registerLearningMediaSeek,
    reportLearningMediaTime,
    learningMediaTime,
    seekLearningMedia,
    isUploadOpen,
    openUpload,
    closeUpload,
    isDragActive,
    isUploadDragActive,
    isDisciplinePickerOpen,
    openDisciplinePicker,
    closeDisciplinePicker,
  } = useTrainingRoomData();

  useEffect(() => {
    setBrand({ label: "Training Room", showLogo: true });
    return () => setBrand(null);
  }, [setBrand]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <Navigation
        openSessions={openSessions}
        closedSessions={closedSessions}
        selectedId={selectedId}
        onSelect={selectSession}
        onAdd={openDisciplinePicker}
        onRename={renameSession}
        onRemove={removeSession}
        onClose={closeSession}
        onReopen={reopenSession}
      />
      {selected ? (
        selected.toolType === "chatRoleplay" ? (
          <ChatRoleplaySession
            key={selected.id}
            session={selected}
            notes={selected.notes}
            onNotesChange={(value) => onNotesChange(selected.id, value)}
            onNameChange={(name) => renameSession(selected.id, name)}
            onRoleplayChange={(roleplay) => updateRoleplay(selected.id, roleplay)}
          />
        ) : selected.toolType === "mindsetShifting" ? (
          <>
            <MindsetShiftingChat key={selected.id} sessionId={selected.id} />
            <Detail
              sessionId={selected.id}
              notes={selected.notes}
              onNotesChange={(value) => onNotesChange(selected.id, value)}
            />
          </>
        ) : selected.toolType === "learning" ? (
          <>
            <LearningHero
              key={selected.id}
              session={selected}
              onNameChange={(name) => renameSession(selected.id, name)}
              onOpenUpload={openUpload}
              onUpdateBlockText={(blockId, content) => updateLearningBlockText(selected.id, blockId, content)}
              onTogglePin={() => toggleLearningPin(selected.id)}
              onSelectFile={(fileId) => selectLearningFile(selected.id, fileId)}
              onRegisterMediaSeek={registerLearningMediaSeek}
              onReportMediaTime={reportLearningMediaTime}
            />
            <LearningDetail
              session={selected}
              generationByMedia={generationByMedia}
              onGenerateTranscript={(fileId, diarize) => generateTranscript(selected.id, fileId, diarize)}
              onStopGenerateTranscript={stopGenerateTranscript}
              onRetryGenerateTranscript={(fileId) => retryGenerateTranscript(selected.id, fileId)}
              onDismissGenerateTranscriptError={dismissGenerateTranscriptError}
              learningMediaTime={learningMediaTime}
              onSeekMedia={seekLearningMedia}
            />
          </>
        ) : (
          <>
            <Hero
              session={selected}
              generationByClip={generationByMedia}
              onNameChange={(name) => renameSession(selected.id, name)}
              onOpenUpload={openUpload}
              onGenerateTranscript={(clipId, diarize) => generateTranscript(selected.id, clipId, diarize)}
              onStopGenerateTranscript={stopGenerateTranscript}
              onRetryGenerateTranscript={(clipId) => retryGenerateTranscript(selected.id, clipId)}
              onDismissGenerateTranscriptError={dismissGenerateTranscriptError}
            />
            <Detail
              sessionId={selected.id}
              notes={selected.notes}
              onNotesChange={(value) => onNotesChange(selected.id, value)}
            />
          </>
        )
      ) : (
        <div className={position.emptyState} data-construction>
          <p className={styles.emptyStateText} data-construction>
            No disciplines practiced yet — add one from the list on the left.
          </p>
        </div>
      )}
      {isDragActive && (
        <div className={`${styles.dropOverlay} ${position.dropOverlay}`} data-construction aria-hidden="true">
          <p className={styles.dropOverlayText} data-construction>
            Drop to add a clip
          </p>
        </div>
      )}
      <VideoUploadModal
        isOpen={isUploadOpen}
        isDragActive={isUploadDragActive}
        onFileSelected={addClip}
        onClose={closeUpload}
        title={selected?.toolType === "learning" ? "Upload a file" : "Upload a clip"}
        dropZoneText={
          selected?.toolType === "learning"
            ? "Drag & drop a video, audio, PDF, or EPUB file here"
            : "Drag & drop a video or audio file here"
        }
      />
      {isDisciplinePickerOpen && (
        <DisciplinePicker
          onClose={closeDisciplinePicker}
          onSelect={(toolType) => {
            addSession(toolType);
            closeDisciplinePicker();
          }}
        />
      )}
    </div>
  );
}
