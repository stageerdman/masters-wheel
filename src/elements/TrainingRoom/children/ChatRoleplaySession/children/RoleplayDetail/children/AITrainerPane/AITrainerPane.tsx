"use client";

import { useEffect, useRef, useState } from "react";
import { useAIAssistantVisibility } from "@/elements/AIAssistant/AIAssistant.context";
import { orderAgentsByRecency, resolveDedicatedAgent, useAIAssistant } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentPicker } from "@/elements/AgentPicker/AgentPicker";
import { Composer } from "@/elements/Composer/Composer";
import { MessageList } from "@/elements/MessageList/MessageList";
import { Sidebar } from "@/elements/Sidebar/Sidebar";
import { useNarrowContainer } from "@/lib/useNarrowContainer";
import { trainerChatsDir } from "@/lib/training";
import position from "./AITrainerPane.position.module.css";
import styles from "./AITrainerPane.styles.module.css";

// Same width Sidebar already treats as "too narrow to split side-by-
// side" everywhere else it's used (AIAssistantWindow, ChatPage) — this
// pane is always well under it (the Detail column is a fixed 360px,
// and Sidebar's own 180px "open" width wouldn't leave room for a chat
// column next to it), so opening history here is always the same
// phone-drawer takeover, never a side-by-side split.
const NARROW_SIDEBAR_BREAKPOINT = 480;

// The real AI Assistant, not a mock, and now the *same designed chat
// experience* as the floating widget / ChatPage — history + a "+" new
// chat button, not just a bare message list. A second, independent,
// always-open useAIAssistant() instance docked inline here, same
// precedent ChatPage already set (its own independent instance + the
// exact same Sidebar/AgentPicker/MessageList/Composer, unmodified). Disk
// is the shared source of truth between every instance, not a live link
// between them — now a real, scoped-away-from-everything-else storage
// root (src/lib/training's trainerChatsDir), not the Space-wide chats/
// dir every other `useAIAssistant()` instance reads from, so a Trainer
// conversation started inside this training session never shows up from
// another training session or the floating widget/ChatPage's own
// history. While this pane is mounted, the floating widget hides itself
// (AIAssistant.context.tsx) so the two are never both on screen.
type AITrainerPaneProps = { sessionId: string };

export function AITrainerPane({ sessionId }: AITrainerPaneProps) {
  const { setFloatingHidden } = useAIAssistantVisibility();
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
    respondToPermission,
  } = useAIAssistant(trainerChatsDir(sessionId));

  useEffect(() => {
    if (phase !== "open") open();
  }, [phase, open]);

  useEffect(() => {
    setFloatingHidden(true);
    return () => setFloatingHidden(false);
  }, [setFloatingHidden]);

  const agentsByRecency = orderAgentsByRecency(agents, sessions);
  const respondingAgent = resolveDedicatedAgent(activeSession, agents);

  // Closed by default, same as the floating widget's own side menu —
  // unlike ChatPage (a dedicated page whose whole point is seeing every
  // chat at a glance), opening this pane should land on the chat itself,
  // not a history drawer covering it.
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

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
          aria-label={isSideMenuOpen ? "Collapse chat history" : "Expand chat history"}
          aria-pressed={isSideMenuOpen}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.topBarButton} ${position.topBarButton}`}
          data-construction
          onClick={handleNewChat}
          aria-label="Start a new chat about this session"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
      <div className={position.content} data-construction ref={contentRef}>
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
          className={`${position.chatColumn} ${isSideMenuOpen ? position.chatColumnSidebarOpen : ""}`}
          data-construction
        >
          {!activeSession.agentId ? (
            <AgentPicker agents={agents} onSelectAgent={startChatWithAgent} />
          ) : (
            <>
              <MessageList
                messages={activeSession.messages}
                density="compact"
                agents={agents}
                respondingAgent={respondingAgent}
                onRespondToPermission={respondToPermission}
              />
              <Composer
                value={composerValue}
                onChange={setComposerValue}
                onSend={sendMessage}
                isSending={isSending}
                density="compact"
                agents={agents}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
