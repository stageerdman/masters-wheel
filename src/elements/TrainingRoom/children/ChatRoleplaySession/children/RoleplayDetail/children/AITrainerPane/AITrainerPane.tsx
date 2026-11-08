"use client";

import { useEffect } from "react";
import { useAIAssistantVisibility } from "@/elements/AIAssistant/AIAssistant.context";
import { resolveDedicatedAgent, useAIAssistant } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentPicker } from "@/elements/AgentPicker/AgentPicker";
import { Composer } from "@/elements/Composer/Composer";
import { MessageList } from "@/elements/MessageList/MessageList";
import position from "./AITrainerPane.position.module.css";
import styles from "./AITrainerPane.styles.module.css";

// The real AI Assistant, not a mock — a second, independent, always-open
// useAIAssistant() instance docked inline here, same precedent ChatPage
// already set (its own independent instance + the exact same
// MessageList/Composer/AgentPicker, unmodified). Disk is the shared
// source of truth between every instance, not a live link between them.
// While this pane is mounted, the floating widget hides itself
// (AIAssistant.context.tsx) so the two are never both on screen — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`.
export function AITrainerPane() {
  const { setFloatingHidden } = useAIAssistantVisibility();
  const {
    phase,
    open,
    activeSession,
    composerValue,
    setComposerValue,
    sendMessage,
    isSending,
    agents,
    startChatWithAgent,
    respondToPermission,
  } = useAIAssistant();

  useEffect(() => {
    if (phase !== "open") open();
  }, [phase, open]);

  useEffect(() => {
    setFloatingHidden(true);
    return () => setFloatingHidden(false);
  }, [setFloatingHidden]);

  const respondingAgent = resolveDedicatedAgent(activeSession, agents);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
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
  );
}
