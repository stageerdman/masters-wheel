import { useState } from "react";
import { askAgent, onAskAgentProgress } from "@/lib/assistant/askAgent";
import { AGENTS, HISTORY_FIXTURES } from "./children/AIAssistantWindow/AIAssistantWindow.data";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };
export type Agent = { id: string; name: string; tagline: string; initial: string; instructions: string };
export type ChatSession = {
  id: string;
  title: string;
  relativeDate: string;
  messages: ChatMessage[];
  activeAgentIds: string[];
  agentId?: string;
  claudeSessionId?: string;
};

// Voice used when no single agent is active in the session — the plain
// "just chat" case. Real agent personas (AGENTS) carry their own
// instructions instead of this.
const DEFAULT_INSTRUCTIONS =
  "You are the Master's Wheel assistant — a focused mastery coach for the person using this app. Keep replies concise and actionable.";

const NEW_SESSION_ID = "current";

function makeNewSession(): ChatSession {
  return { id: NEW_SESSION_ID, title: "New chat", relativeDate: "Now", messages: [], activeAgentIds: [] };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Which agents a message text @mentions — matches "@" + an agent's exact
// name at a word boundary (so "@Coachella" doesn't match "Coach"). Used
// both to auto-add mentioned agents when a message is sent, and (with
// its own copy in Message.script.ts, which needs segment positions
// rather than a plain list) to render the mention as a styled tag.
export function findMentionedAgents(text: string, agents: Agent[]): Agent[] {
  return agents.filter((agent) => new RegExp(`@${escapeRegExp(agent.name)}\\b`).test(text));
}

// Owns the assistant's open/closed state and every chat session's
// content. Lives here (not inside AIAssistantWindow) so it survives
// collapsing the window back to the icon — collapsing minimizes, it
// doesn't reset the conversation. Dock/drag/resize/placement state is a
// separate, unrelated concern — see AIAssistant.windowDock.script.ts.
export function useAIAssistant() {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const [sessions, setSessions] = useState<ChatSession[]>([makeNewSession(), ...HISTORY_FIXTURES]);
  const [activeSessionId, setActiveSessionId] = useState(NEW_SESSION_ID);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  function open() {
    setPhase("open");
  }

  // Starts the collapse transition; the window itself reports back via
  // finishCollapse once its exit transition has actually finished playing.
  function collapse() {
    setPhase("closing");
  }

  function finishCollapse() {
    setPhase((current) => (current === "closing" ? "closed" : current));
  }

  function selectSession(id: string) {
    setActiveSessionId(id);
  }

  function appendMessageToActive(message: ChatMessage) {
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId ? { ...session, messages: [...session.messages, message] } : session,
      ),
    );
  }

  // Rewrites one message by id within a specific session (not necessarily
  // the currently-active one — the user may switch sessions mid-reply) —
  // used to grow the assistant's placeholder bubble as delta events arrive.
  function updateMessageInSession(sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, messages: session.messages.map((message) => (message.id === messageId ? updater(message) : message)) }
          : session,
      ),
    );
  }

  async function sendMessage() {
    const text = composerValue.trim();
    if (!text || isSending) return;
    const sessionIdAtSend = activeSessionId;
    appendMessageToActive({ id: crypto.randomUUID(), role: "user", text });
    setComposerValue("");
    // Mentioning an agent in the message text brings them into the
    // conversation the same way dragging their roster card does.
    for (const agent of findMentionedAgents(text, AGENTS)) {
      addAgentToActiveChat(agent.id);
    }

    const session = sessions.find((candidate) => candidate.id === sessionIdAtSend);
    const activeAgents = AGENTS.filter((agent) => session?.activeAgentIds.includes(agent.id));
    // v1 only gives a real, persona-specific reply when exactly one agent
    // is active; 0 or 2+ falls back to the generic assistant voice for now
    // — real multi-agent replies are the next increment (see this app's
    // AGENTS-ENGINE update).
    const instructions = activeAgents.length === 1 ? activeAgents[0].instructions : DEFAULT_INSTRUCTIONS;

    // An empty assistant bubble renders as a "thinking" indicator (see
    // Message.tsx) until the first delta arrives, then grows token-by-token
    // — this is what replaces the old silent wait + sudden full reply.
    const replyId = crypto.randomUUID();
    appendMessageToActive({ id: replyId, role: "assistant", text: "" });

    const jobId = crypto.randomUUID();
    const unlisten = await onAskAgentProgress((progress) => {
      if (progress.jobId !== jobId) return;
      updateMessageInSession(sessionIdAtSend, replyId, (message) => ({ ...message, text: message.text + progress.delta }));
    });

    setIsSending(true);
    try {
      const reply = await askAgent(jobId, text, instructions, session?.claudeSessionId);
      // The streamed-in text above is provisional (deltas could in theory
      // drop or reorder); the CLI's final `result` text is authoritative,
      // so it always wins here.
      updateMessageInSession(sessionIdAtSend, replyId, (message) => ({
        ...message,
        text: reply.text || "(no reply)",
      }));
      setSessions((current) =>
        current.map((candidate) =>
          candidate.id === sessionIdAtSend ? { ...candidate, claudeSessionId: reply.sessionId } : candidate,
        ),
      );
    } catch (error) {
      updateMessageInSession(sessionIdAtSend, replyId, (message) => ({
        ...message,
        role: "system",
        text: `Couldn't reach Claude: ${error}`,
      }));
    } finally {
      unlisten();
      setIsSending(false);
    }
  }

  // Selecting an agent (vs. dragging one into the current chat) switches
  // to a dedicated session with that agent, creating it on first select.
  function selectAgent(agentId: string) {
    const existing = sessions.find((session) => session.agentId === agentId);
    if (existing) {
      setActiveSessionId(existing.id);
      return;
    }
    const agent = AGENTS.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat with ${agent.name}`,
      relativeDate: "Now",
      messages: [],
      activeAgentIds: [],
      agentId,
    };
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
  }

  function addAgentToActiveChat(agentId: string) {
    const agent = AGENTS.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== activeSessionId || session.activeAgentIds.includes(agentId)) return session;
        return {
          ...session,
          activeAgentIds: [...session.activeAgentIds, agentId],
          messages: [
            ...session.messages,
            { id: crypto.randomUUID(), role: "system", text: `${agent.name} added to the conversation` },
          ],
        };
      }),
    );
  }

  function removeAgentFromActiveChat(agentId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId
          ? { ...session, activeAgentIds: session.activeAgentIds.filter((id) => id !== agentId) }
          : session,
      ),
    );
  }

  return {
    phase,
    open,
    collapse,
    finishCollapse,
    sessions,
    activeSessionId,
    activeSession,
    selectSession,
    composerValue,
    setComposerValue,
    sendMessage,
    isSending,
    agents: AGENTS,
    selectAgent,
    addAgentToActiveChat,
    removeAgentFromActiveChat,
  };
}
