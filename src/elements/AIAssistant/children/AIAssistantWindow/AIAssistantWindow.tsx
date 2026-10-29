"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import type { DockState, PresetOverride } from "@/elements/AIAssistant/AIAssistant.windowDock.script";
import { ActiveAgentChip } from "./children/ActiveAgentChip/ActiveAgentChip";
import { AgentRoster } from "./children/AgentRoster/AgentRoster";
import { Composer } from "./children/Composer/Composer";
import { HistoryList } from "./children/HistoryList/HistoryList";
import { MessageList } from "./children/MessageList/MessageList";
import { useChatDropTarget, useWindowEnterTransition, useWindowGeometry } from "./AIAssistantWindow.script";
import position from "./AIAssistantWindow.position.module.css";
import styles from "./AIAssistantWindow.styles.module.css";

type AIAssistantWindowProps = {
  isClosing: boolean;
  onCollapse: () => void;
  onCollapsed: () => void;
  activeSession: ChatSession;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  density: "compact" | "comfortable";
  dockState: DockState;
  dragOffset: { x: number; y: number } | null;
  onHeaderPointerDown: (event: ReactPointerEvent) => void;
  windowRef: RefObject<HTMLDivElement | null>;
  manualSize: { width: number; height: number } | null;
  isResizing: boolean;
  onResizeHandlePointerDown: (event: ReactPointerEvent) => void;
  activeOverride: PresetOverride | undefined;
  isSideMenuOpen: boolean;
  onToggleSideMenu: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onDropAgentIntoChat: (id: string) => void;
  onRemoveAgentFromChat: (id: string) => void;
};

const DOCK_CLASS: Record<DockState, string> = {
  left: position.dockLeft,
  center: position.dockCenter,
};

export function AIAssistantWindow({
  isClosing,
  onCollapse,
  onCollapsed,
  activeSession,
  composerValue,
  onComposerChange,
  onSend,
  density,
  dockState,
  dragOffset,
  onHeaderPointerDown,
  windowRef,
  manualSize,
  isResizing,
  onResizeHandlePointerDown,
  activeOverride,
  isSideMenuOpen,
  onToggleSideMenu,
  sessions,
  onSelectSession,
  agents,
  onSelectAgent,
  onDropAgentIntoChat,
  onRemoveAgentFromChat,
}: AIAssistantWindowProps) {
  const hasEntered = useWindowEnterTransition();
  const { showCollapsedGeometry, style } = useWindowGeometry({
    isClosing,
    hasEntered,
    dragOffset,
    manualSize,
    activeOverride,
  });
  const { isDragOver, onDragOver, onDragLeave, onDrop } = useChatDropTarget(onDropAgentIntoChat);

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (isClosing) onCollapsed();
  }

  const geometryClass = showCollapsedGeometry ? position.enter : DOCK_CLASS[dockState];
  const visibilityClass = showCollapsedGeometry ? styles.hidden : styles.visible;
  const transitionSpeedClass = isClosing ? position.closing : "";
  const draggingClass = dragOffset ? position.dragging : "";
  const resizingClass = isResizing ? position.resizing : "";

  const activeAgents = agents.filter((agent) => activeSession.activeAgentIds.includes(agent.id));

  return (
    <div
      ref={windowRef}
      className={`${styles.root} ${position.root} ${geometryClass} ${visibilityClass} ${transitionSpeedClass} ${draggingClass} ${resizingClass}`}
      style={style}
      data-construction
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={`${styles.header} ${position.header}`} data-construction>
        <button
          type="button"
          className={`${styles.headerButton} ${position.headerButton}`}
          data-construction
          onClick={onToggleSideMenu}
          aria-label={isSideMenuOpen ? "Collapse side menu" : "Expand side menu"}
          aria-pressed={isSideMenuOpen}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <div
          className={`${styles.dragHandle} ${position.dragHandle}`}
          data-construction
          onPointerDown={onHeaderPointerDown}
        />
        <button
          type="button"
          className={`${styles.headerButton} ${position.headerButton}`}
          data-construction
          onClick={onCollapse}
          aria-label="Collapse AI assistant"
        >
          <span className={`${styles.collapseGlyph} ${position.collapseGlyph}`} data-construction />
        </button>
      </div>
      <div
        className={position.resizeHandle}
        data-construction
        aria-hidden="true"
        onPointerDown={onResizeHandlePointerDown}
      />
      <div className={`${styles.content} ${position.content}`} data-construction>
        <div
          className={`${styles.sidebar} ${position.sidebar} ${isSideMenuOpen ? position.sidebarOpen : ""}`}
          data-construction
        >
          <HistoryList sessions={sessions} activeId={activeSession.id} onSelect={onSelectSession} />
          <AgentRoster agents={agents} onSelect={onSelectAgent} />
        </div>
        <div
          className={`${styles.chatColumn} ${position.chatColumn} ${isDragOver ? styles.dragOver : ""}`}
          data-construction
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {activeAgents.length > 0 && (
            <div className={`${styles.chipRow} ${position.chipRow}`} data-construction>
              {activeAgents.map((agent) => (
                <ActiveAgentChip key={agent.id} agent={agent} onRemove={() => onRemoveAgentFromChat(agent.id)} />
              ))}
            </div>
          )}
          <MessageList messages={activeSession.messages} density={density} />
          <Composer value={composerValue} onChange={onComposerChange} onSend={onSend} density={density} />
        </div>
      </div>
    </div>
  );
}
