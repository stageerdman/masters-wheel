"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { resolveDedicatedAgent } from "@/elements/AIAssistant/AIAssistant.script";
import type { DockState, PresetOverride } from "@/elements/AIAssistant/AIAssistant.windowDock.script";
import type { RecordSummary } from "@/lib/records";
import type { SessionSummary as TrainingSessionSummary } from "@/lib/training";
import type { ChatTag, TaggedResourceKind } from "@/lib/mcp/types";
import { useNarrowContainer } from "@/lib/useNarrowContainer";
import { AgentPicker } from "@/elements/AgentPicker/AgentPicker";
import { Composer } from "@/elements/Composer/Composer";
import { MessageList } from "@/elements/MessageList/MessageList";
import { Sidebar } from "@/elements/Sidebar/Sidebar";
import { TagBar } from "@/elements/TagBar/TagBar";
import { useWindowEnterTransition, useWindowGeometry } from "./AIAssistantWindow.script";
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
  isSending: boolean;
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
  onCloseSideMenu: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  agents: Agent[];
  agentsByRecency: Agent[];
  onSelectAgent: (id: string) => void;
  onPickAgentForNewChat: (id: string) => void;
  recordSummaries: RecordSummary[];
  trainingSessionSummaries: TrainingSessionSummary[];
  visibleTags: ChatTag[];
  onRemoveTag: (resourceKind: TaggedResourceKind, resourceId: string) => void;
};

const DOCK_CLASS: Record<DockState, string> = {
  left: position.dockLeft,
  center: position.dockCenter,
};

// Must stay in sync with AIAssistantWindow.position.module.css's own
// `@container window-content (max-width: 480px)` — below this width the
// sidebar stops being a side-by-side column and becomes a full-width
// overlay, which is the only situation auto-closing it on navigation
// below actually makes sense in.
const NARROW_SIDEBAR_BREAKPOINT = 480;

export function AIAssistantWindow({
  isClosing,
  onCollapse,
  onCollapsed,
  activeSession,
  composerValue,
  onComposerChange,
  onSend,
  isSending,
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
  onCloseSideMenu,
  sessions,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  agents,
  agentsByRecency,
  onSelectAgent,
  onPickAgentForNewChat,
  recordSummaries,
  trainingSessionSummaries,
  visibleTags,
  onRemoveTag,
}: AIAssistantWindowProps) {
  const hasEntered = useWindowEnterTransition();
  const { showCollapsedGeometry, style } = useWindowGeometry({
    isClosing,
    hasEntered,
    dragOffset,
    manualSize,
    activeOverride,
  });

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (isClosing) onCollapsed();
  }

  // Below NARROW_SIDEBAR_BREAKPOINT the sidebar is a full-width overlay
  // (see the container query on `.content` itself) sitting on top of the
  // entire chat column — navigating anywhere from it should close it back
  // out of the way automatically, the way a phone's nav drawer does. Above
  // that width it's a side-by-side column with its own room, so selecting
  // a chat there leaves it exactly as the user left it.
  const contentRef = useRef<HTMLDivElement>(null);
  const isSidebarOverlay = useNarrowContainer(contentRef, NARROW_SIDEBAR_BREAKPOINT);

  function handleSelectSession(id: string) {
    onSelectSession(id);
    if (isSidebarOverlay) onCloseSideMenu();
  }

  function handleNewChat() {
    onNewChat();
    if (isSidebarOverlay) onCloseSideMenu();
  }

  const geometryClass = showCollapsedGeometry ? position.enter : DOCK_CLASS[dockState];
  const visibilityClass = showCollapsedGeometry ? styles.hidden : styles.visible;
  const transitionSpeedClass = isClosing ? position.closing : "";
  const draggingClass = dragOffset ? position.dragging : "";
  const resizingClass = isResizing ? position.resizing : "";

  // Whoever this session is dedicated to — MessageList/Message use this
  // for the "who am I talking to" empty-state profile and as the avatar
  // fallback for any assistant message that doesn't carry its own agentId.
  const respondingAgent = resolveDedicatedAgent(activeSession, agents);

  return (
    <div
      id="ai-assistant-window"
      ref={windowRef}
      className={`${styles.root} ${position.root} ${geometryClass} ${visibilityClass} ${transitionSpeedClass} ${draggingClass} ${resizingClass}`}
      style={style}
      data-construction
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={`${styles.glassShell} ${position.glassShell}`} data-construction>
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
          <button
            type="button"
            className={`${styles.headerButton} ${position.headerButton}`}
            data-construction
            onClick={handleNewChat}
            aria-label="Start a new chat"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="1.3" />
              <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
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
        <div className={`${styles.content} ${position.content}`} data-construction ref={contentRef}>
          <Sidebar
            isOpen={isSideMenuOpen}
            sessions={sessions}
            activeSessionId={activeSession.id}
            onSelectSession={handleSelectSession}
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            agents={agents}
            agentsByRecency={agentsByRecency}
            onSelectAgent={onSelectAgent}
          />
          <div
            className={`${styles.chatColumn} ${position.chatColumn} ${isSideMenuOpen ? position.chatColumnSidebarOpen : ""}`}
            data-construction
          >
            {!activeSession.agentId ? (
              <AgentPicker agents={agents} onSelectAgent={onPickAgentForNewChat} />
            ) : (
              <>
                <TagBar
                  tags={visibleTags}
                  records={recordSummaries}
                  trainingSessions={trainingSessionSummaries}
                  onRemove={onRemoveTag}
                />
                <MessageList
                  messages={activeSession.messages}
                  density={density}
                  agents={agents}
                  respondingAgent={respondingAgent}
                />
                <Composer
                  value={composerValue}
                  onChange={onComposerChange}
                  onSend={onSend}
                  isSending={isSending}
                  density={density}
                  agents={agents}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
