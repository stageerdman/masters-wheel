"use client";

import { useState } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Agent, ChatSession, CustomPlacement, DockState } from "@/elements/AIAssistant/AIAssistant.script";
import { ActiveAgentChip } from "./children/ActiveAgentChip/ActiveAgentChip";
import { AgentRoster } from "./children/AgentRoster/AgentRoster";
import { Composer } from "./children/Composer/Composer";
import { HistoryList } from "./children/HistoryList/HistoryList";
import { MessageList } from "./children/MessageList/MessageList";
import { useWindowEnterTransition } from "./AIAssistantWindow.script";
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
  customPlacement: CustomPlacement | null;
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
  hybrid: position.dockHybrid,
  custom: position.dockCustom,
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
  customPlacement,
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
  const [isDragOver, setIsDragOver] = useState(false);

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (isClosing) onCollapsed();
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const agentId = event.dataTransfer.getData("text/plain");
    if (agentId) onDropAgentIntoChat(agentId);
  }

  const showCollapsedGeometry = !hasEntered || isClosing;
  const geometryClass = showCollapsedGeometry ? position.enter : DOCK_CLASS[dockState];
  const visibilityClass = showCollapsedGeometry ? styles.hidden : styles.visible;
  const transitionSpeedClass = isClosing ? position.closing : "";
  const draggingClass = dragOffset ? position.dragging : "";
  const resizingClass = isResizing ? position.resizing : "";

  const inlineStyle: React.CSSProperties = {};
  if (dragOffset) {
    Object.assign(inlineStyle, { "--drag-x": `${dragOffset.x}px`, "--drag-y": `${dragOffset.y}px` });
  }
  if (dockState === "custom" && customPlacement && !showCollapsedGeometry) {
    // A saved/just-placed custom spot — exact pixels, takes over entirely.
    Object.assign(inlineStyle, {
      left: `${customPlacement.left}px`,
      top: `${customPlacement.top}px`,
      width: `${customPlacement.width}px`,
      height: `${customPlacement.height}px`,
    });
  } else if (manualSize && !showCollapsedGeometry) {
    // Ephemeral resize of a preset — overrides width/height (and top, so
    // the bottom edge stays flush); clears the moment the window redocks.
    Object.assign(inlineStyle, {
      width: `${manualSize.width}px`,
      height: `${manualSize.height}px`,
      top: `calc(100vh - ${manualSize.height}px)`,
    });
  }
  const hasInlineStyle = Object.keys(inlineStyle).length > 0;

  const activeAgents = agents.filter((agent) => activeSession.activeAgentIds.includes(agent.id));

  return (
    <div
      ref={windowRef}
      className={`${styles.root} ${position.root} ${geometryClass} ${visibilityClass} ${transitionSpeedClass} ${draggingClass} ${resizingClass}`}
      style={hasInlineStyle ? inlineStyle : undefined}
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
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
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
