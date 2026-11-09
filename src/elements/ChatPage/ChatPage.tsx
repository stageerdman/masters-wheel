"use client";

import { useEffect, useRef, useState } from "react";
import { orderAgentsByRecency, resolveDedicatedAgent, useAIAssistant } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentPicker } from "@/elements/AgentPicker/AgentPicker";
import { Composer } from "@/elements/Composer/Composer";
import { MessageList } from "@/elements/MessageList/MessageList";
import { Sidebar } from "@/elements/Sidebar/Sidebar";
import { TagBar } from "@/elements/TagBar/TagBar";
import { useNarrowContainer } from "@/lib/useNarrowContainer";
import position from "./ChatPage.position.module.css";
import styles from "./ChatPage.styles.module.css";

// Must stay in sync with ChatPage.position.module.css's own
// `@container window-content (max-width: ...)` — see AIAssistantWindow's
// identical constant for why this threshold exists at all.
const NARROW_SIDEBAR_BREAKPOINT = 480;

// The full-screen "universal" AI chat surface behind Main Menu's "Chat
// with AI" item — same engine (useAIAssistant) and the same designed chat
// experience (Sidebar/AgentPicker/TagBar/MessageList/Composer, all reused
// unchanged) as the floating AIAssistant widget, just laid out full-screen
// with a persistent, default-open sidebar instead of a collapsible drawer.
// Its own independent useAIAssistant() instance — disk is the shared
// source of truth between this and the floating widget, not any live
// in-memory link — which is exactly why AIAssistant.tsx hides the floating
// widget entirely on this route rather than risk two out-of-sync copies
// of the same chat state on screen at once.
export function ChatPage() {
  const {
    phase,
    open,
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
    respondToPermission,
  } = useAIAssistant();

  // useAIAssistant's own agent/record/session-loading effects only run
  // once `phase` is "open" — built for the floating widget's
  // closed/open/closing lifecycle. This page has no such lifecycle of its
  // own, so it just flips that switch once on mount and leaves it there
  // for as long as the page stays mounted.
  useEffect(() => {
    if (phase !== "open") open();
  }, [phase, open]);

  const agentsByRecency = orderAgentsByRecency(agents, sessions);
  const respondingAgent = resolveDedicatedAgent(activeSession, agents);

  // Default open — unlike the floating widget's collapsible drawer, this
  // page's whole point is seeing every chat in the Space at a glance.
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);
  const isSidebarOverlay = useNarrowContainer(contentRef, NARROW_SIDEBAR_BREAKPOINT);

  function handleSelectSession(id: string) {
    selectSession(id);
    if (isSidebarOverlay) setIsSideMenuOpen(false);
  }

  function handleNewChat() {
    startNewChat();
    if (isSidebarOverlay) setIsSideMenuOpen(false);
  }

  function handleSelectAgent(id: string) {
    selectAgent(id);
    if (isSidebarOverlay) setIsSideMenuOpen(false);
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={`${styles.topBar} ${position.topBar}`} data-construction>
        <button
          type="button"
          className={`${styles.topBarButton} ${position.topBarButton}`}
          data-construction
          onClick={() => setIsSideMenuOpen((current) => !current)}
          aria-label={isSideMenuOpen ? "Collapse chat list" : "Expand chat list"}
          aria-pressed={isSideMenuOpen}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.topBarButton} ${position.topBarButton}`}
          data-construction
          onClick={handleNewChat}
          aria-label="Start a new chat"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
      <div className={`${position.content}`} data-construction ref={contentRef}>
        <Sidebar
          isOpen={isSideMenuOpen}
          sessions={sessions}
          activeSessionId={activeSession.id}
          onSelectSession={handleSelectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          agents={agents}
          agentsByRecency={agentsByRecency}
          onSelectAgent={handleSelectAgent}
        />
        <div
          className={`${styles.chatColumn} ${position.chatColumn} ${isSideMenuOpen ? position.chatColumnSidebarOpen : ""}`}
          data-construction
        >
          {!activeSession.agentId ? (
            <AgentPicker agents={agents} onSelectAgent={startChatWithAgent} />
          ) : (
            <>
              <TagBar
                tags={visibleTags}
                records={recordSummaries}
                trainingSessions={trainingSessionSummaries}
                onRemove={removeTag}
              />
              <MessageList
                messages={activeSession.messages}
                density="comfortable"
                agents={agents}
                respondingAgent={respondingAgent}
                onRespondToPermission={respondToPermission}
              />
              <Composer
                value={composerValue}
                onChange={setComposerValue}
                onSend={sendMessage}
                isSending={isSending}
                density="comfortable"
                agents={agents}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
