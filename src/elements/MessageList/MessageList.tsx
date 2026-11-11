"use client";

import { useLayoutEffect, useRef } from "react";
import type { Agent, ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import { agentDescription } from "@/lib/agents";
import { Message } from "./children/Message/Message";
import { SearchResults } from "./children/SearchResults/SearchResults";
import position from "./MessageList.position.module.css";
import styles from "./MessageList.styles.module.css";

type MessageListProps = {
  messages: ChatMessage[];
  density: "compact" | "comfortable";
  agents: Agent[];
  respondingAgent: Agent | undefined;
};

// How close to the bottom (px) still counts as "reading the latest" —
// new/streaming content keeps the view pinned only while within this.
const STICK_THRESHOLD = 80;

export function MessageList({ messages, density, agents, respondingAgent }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);
  // The first message's id identifies the thread — when it changes (chat
  // opened, session switched, history finished loading) jump to the newest.
  const threadKey = messages[0]?.id;
  const lastThreadKey = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const isNewThread = threadKey !== lastThreadKey.current;
    lastThreadKey.current = threadKey;
    if (isNewThread || stuckToBottom.current) {
      list.scrollTop = list.scrollHeight;
      stuckToBottom.current = true;
    }
  }, [messages, threadKey]);

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    stuckToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight <= STICK_THRESHOLD;
  }

  return (
    <div ref={listRef} onScroll={handleScroll} className={`${styles.root} ${position.root}`} data-construction>
      {messages.length === 0 ? (
        respondingAgent ? (
          <div className={`${styles.profile} ${position.profile}`} data-construction>
            <AgentAvatar agent={respondingAgent} size={56} />
            <p className={`${styles.profileName} ${position.profileName}`} data-construction>
              {respondingAgent.name}
            </p>
            <p className={`${styles.profileDescription} ${position.profileDescription}`} data-construction>
              {agentDescription(respondingAgent)}
            </p>
          </div>
        ) : (
          <p className={`${styles.empty} ${position.empty}`} data-construction>
            Ask anything.
          </p>
        )
      ) : (
        messages.map((message) => {
          // Every assistant message now carries who actually said it
          // (see AIAssistant.script.ts's dispatchAgentReply) — a thread
          // with 2+ replying agents shows each reply under its real
          // author instead of one session-wide identity. Falls back to
          // the session's single resolved agent for messages saved
          // before this existed.
          const author = message.agentId ? agents.find((agent) => agent.id === message.agentId) : respondingAgent;
          if (message.searchResults) {
            return <SearchResults key={message.id} results={message.searchResults} />;
          }
          return <Message key={message.id} message={message} density={density} agents={agents} respondingAgent={author} />;
        })
      )}
    </div>
  );
}
