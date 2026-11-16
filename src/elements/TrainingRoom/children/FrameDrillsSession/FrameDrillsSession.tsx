"use client";

import { useRef } from "react";
import { FRAME_DRILLS_DETAIL_KIND_ORDER, type TrainingSession } from "@/elements/TrainingRoom/TrainingRoom.data";
import { Detail } from "../Detail/Detail";
import { DrillsHero } from "./children/DrillsHero/DrillsHero";
import { FrameTemplateList } from "./children/FrameTemplateList/FrameTemplateList";
import { useFrameDrillsSession, type UpdateFrameDrills } from "./FrameDrillsSession.script";
import position from "./FrameDrillsSession.position.module.css";
import styles from "./FrameDrillsSession.styles.module.css";

type FrameDrillsSessionProps = {
  session: TrainingSession;
  onNameChange: (name: string) => void;
  onNotesChange: (value: string) => void;
  onFrameDrillsChange: UpdateFrameDrills;
};

// Replaces the generic Hero/Detail pair for the Frame Drills discipline:
// drills (text + record + timer) in the Hero, every saved frame in the
// Detail. Owns the templates list so the Hero's "save as template" and
// the Detail's list stay one source of truth. Rendered with `key=session.id`
// (see TrainingRoom.tsx), so switching sessions stops any live take.
export function FrameDrillsSession({ session, onNameChange, onNotesChange, onFrameDrillsChange }: FrameDrillsSessionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const drills = useFrameDrillsSession(session.id, session.frameDrills?.drills ?? [], onFrameDrillsChange);

  // Recording while a take is playing back would record the playback too.
  function pauseAllPlayback() {
    rootRef.current?.querySelectorAll("audio").forEach((audio) => audio.pause());
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${position.root}`} data-construction>
      <DrillsHero
        sessionId={session.id}
        name={session.name}
        onNameChange={onNameChange}
        drills={drills}
        onBeforeRecord={pauseAllPlayback}
      />
      <Detail
        sessionId={session.id}
        notes={session.notes}
        onNotesChange={onNotesChange}
        kindOrder={FRAME_DRILLS_DETAIL_KIND_ORDER}
        storageKey={`frame-drills-detail-split-${session.id}`}
        renderKind={(kind) =>
          kind === "frames" ? (
            <FrameTemplateList
              templates={drills.templates}
              onAdd={(template) => drills.addDrill(template.text)}
              onDelete={(template) => void drills.deleteTemplate(template.id)}
            />
          ) : null
        }
      />
    </div>
  );
}
