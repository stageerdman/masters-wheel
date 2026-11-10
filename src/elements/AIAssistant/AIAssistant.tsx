"use client";

import { usePathname } from "next/navigation";
import { useAIAssistantVisibility } from "./AIAssistant.context";
import { AIAssistantTrigger } from "./children/AIAssistantTrigger/AIAssistantTrigger";
import { AIAssistantWindow } from "./children/AIAssistantWindow/AIAssistantWindow";
import { DockZoneOverlay } from "./children/DockZoneOverlay/DockZoneOverlay";
import { orderAgentsByRecency, useAIAssistant } from "./AIAssistant.script";
import { useWindowDock } from "./AIAssistant.windowDock.script";
import position from "./AIAssistant.position.module.css";
import styles from "./AIAssistant.styles.module.css";

// The full-screen ChatPage at this route is the same chat experience,
// just full-screen with its own independent useAIAssistant() instance —
// showing the floating widget there too would risk two out-of-sync copies
// of the same chat state on screen at once (see ChatPage.tsx). A second,
// same-route case of this (one isolated session view embedding its own
// independent instance inline, e.g. Training Room's AITrainerPane) can't
// be keyed off the route at all — that goes through isFloatingHidden
// (AIAssistant.context.tsx) instead, set/cleared by whichever component
// is currently showing an inline instance.
const HIDDEN_ON_ROUTES = ["/chat"];

// Lives on top of every environment. Mounted once from the root layout.
export function AIAssistant() {
  const pathname = usePathname();
  const { isFloatingHidden } = useAIAssistantVisibility();
  const {
    phase,
    open,
    collapse,
    finishCollapse,
    sessions,
    activeSession,
    selectSession,
    startNewChat,
    deleteSession,
    renameSession,
    composerValue,
    setComposerValue,
    sendMessage,
    isSending,
    agents,
    selectAgent,
    startChatWithAgent,
    removeTag,
    visibleTags,
    recordSummaries,
    trainingSessionSummaries,
  } = useAIAssistant();
  const {
    windowRef,
    dockState,
    dragZone,
    dragOffset,
    onHeaderPointerDown,
    manualSize,
    isResizing,
    onResizeHandlePointerDown,
    presetOverrides,
    isSideMenuOpen,
    toggleSideMenu,
    closeSideMenu,
  } = useWindowDock();

  // Left dock stays compact; center gets the roomier feel.
  const density = dockState === "left" ? "compact" : "comfortable";
  const agentsByRecency = orderAgentsByRecency(agents, sessions);

  // Picking an agent should drop straight into their chat, not leave the
  // sidebar sitting open over it.
  function handleSelectAgent(id: string) {
    selectAgent(id);
    closeSideMenu();
  }

  if (HIDDEN_ON_ROUTES.includes(pathname) || isFloatingHidden) return null;

  return (
    <div id="ai-assistant-root" className={`${styles.root} ${position.root}`} data-construction>
      <DockZoneOverlay activeZone={dragZone} presetOverrides={presetOverrides} />
      {phase === "closed" ? (
        <AIAssistantTrigger onOpen={open} />
      ) : (
        <AIAssistantWindow
          isClosing={phase === "closing"}
          onCollapse={collapse}
          onCollapsed={finishCollapse}
          activeSession={activeSession}
          composerValue={composerValue}
          onComposerChange={setComposerValue}
          onSend={sendMessage}
          isSending={isSending}
          density={density}
          dockState={dockState}
          dragOffset={dragOffset}
          onHeaderPointerDown={onHeaderPointerDown}
          windowRef={windowRef}
          manualSize={manualSize}
          isResizing={isResizing}
          onResizeHandlePointerDown={onResizeHandlePointerDown}
          activeOverride={presetOverrides[dockState]}
          isSideMenuOpen={isSideMenuOpen}
          onToggleSideMenu={toggleSideMenu}
          onCloseSideMenu={closeSideMenu}
          sessions={sessions}
          onSelectSession={selectSession}
          onNewChat={startNewChat}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          agents={agents}
          agentsByRecency={agentsByRecency}
          onSelectAgent={handleSelectAgent}
          onPickAgentForNewChat={startChatWithAgent}
          recordSummaries={recordSummaries}
          trainingSessionSummaries={trainingSessionSummaries}
          visibleTags={visibleTags}
          onRemoveTag={removeTag}
        />
      )}
    </div>
  );
}
