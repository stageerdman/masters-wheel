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
    addClip,
    generateTranscript,
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
          />
        ) : (
          <>
            <Hero
              session={selected}
              onNameChange={(name) => renameSession(selected.id, name)}
              onOpenUpload={openUpload}
              onGenerateTranscript={(clipId) => generateTranscript(selected.id, clipId)}
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
        title="Upload a clip"
        dropZoneText="Drag & drop a video or audio file here"
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
