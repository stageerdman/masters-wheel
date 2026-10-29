"use client";

import { AIAssistantTrigger } from "./children/AIAssistantTrigger/AIAssistantTrigger";
import { AIAssistantWindow } from "./children/AIAssistantWindow/AIAssistantWindow";
import { DockZoneOverlay } from "./children/DockZoneOverlay/DockZoneOverlay";
import { useAIAssistant, useWindowDock } from "./AIAssistant.script";
import position from "./AIAssistant.position.module.css";
import styles from "./AIAssistant.styles.module.css";

// Lives on top of every environment. Mounted once from the root layout.
export function AIAssistant() {
  const {
    phase,
    open,
    collapse,
    finishCollapse,
    messages,
    composerValue,
    setComposerValue,
    sendMessage,
  } = useAIAssistant();
  const { dockState, dragZone, dragOffset, onHeaderPointerDown } = useWindowDock();

  // Left dock stays compact; center and hybrid both get the roomier feel.
  const density = dockState === "left" ? "compact" : "comfortable";

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <DockZoneOverlay activeZone={dragZone} />
      {phase === "closed" ? (
        <AIAssistantTrigger onOpen={open} />
      ) : (
        <AIAssistantWindow
          isClosing={phase === "closing"}
          onCollapse={collapse}
          onCollapsed={finishCollapse}
          messages={messages}
          composerValue={composerValue}
          onComposerChange={setComposerValue}
          onSend={sendMessage}
          density={density}
          dockState={dockState}
          dragOffset={dragOffset}
          onHeaderPointerDown={onHeaderPointerDown}
        />
      )}
    </div>
  );
}
