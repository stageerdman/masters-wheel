"use client";

import { useEffect } from "react";
import { useAIAssistantVisibility } from "@/elements/AIAssistant/AIAssistant.context";
import { resolveDedicatedAgent, useAIAssistant } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentPicker } from "@/elements/AgentPicker/AgentPicker";
import { Composer } from "@/elements/Composer/Composer";
import { MessageList } from "@/elements/MessageList/MessageList";
import { mindsetShiftingChatsDir } from "@/lib/training";
import position from "./MindsetShiftingChat.position.module.css";
import styles from "./MindsetShiftingChat.styles.module.css";

type MindsetShiftingChatProps = { sessionId: string };

// Mindset Shifting's whole discipline *is* a single AI chat — no Hero
// feed, no setup thread, no history switcher. Pick an agent once and the
// entire main column becomes that one conversation with them: same
// engine (useAIAssistant) and the same designed chat experience
// (AgentPicker/MessageList/Composer) as the floating AI Assistant/
// ChatPage, just without Sidebar/TagBar/multi-chat — this component never
// calls startNewChat, so there is only ever one chat per session,
// scoped to this training session's own folder (src/lib/training's
// mindsetShiftingChatsDir) so it never mixes with another session's
// chat or the floating widget/ChatPage's own history. While this is
// mounted the floating widget hides itself (AIAssistant.context.tsx),
// same precedent as ChatRoleplaySession's AITrainerPane.
export function MindsetShiftingChat({ sessionId }: MindsetShiftingChatProps) {
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
  } = useAIAssistant(mindsetShiftingChatsDir(sessionId));

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
            density="comfortable"
            agents={agents}
            respondingAgent={respondingAgent}
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
  );
}
