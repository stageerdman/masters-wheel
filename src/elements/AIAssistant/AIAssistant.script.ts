import { useEffect, useState } from "react";
import { askAgent, onAskAgentProgress } from "@/lib/assistant/askAgent";
import { listAgents, type Agent } from "@/lib/agents";
import { HISTORY_FIXTURES } from "./children/AIAssistantWindow/AIAssistantWindow.data";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };
export type ChatSession = {
  id: string;
  title: string;
  relativeDate: string;
  messages: ChatMessage[];
  activeAgentIds: string[];
  agentId?: string;
  claudeSessionId?: string;
};

export type { Agent };

const NEW_SESSION_ID = "current";

function makeNewSession(id: string = NEW_SESSION_ID): ChatSession {
  return { id, title: "New chat", relativeDate: "Now", messages: [], activeAgentIds: [] };
}

// A freshly-opened chat with nobody picked yet and nothing said yet —
// AIAssistantWindow shows the AgentPicker instead of the message list for
// exactly this shape, and HistoryList hides it (it isn't a real past
// conversation, just the current "pick someone" prompt).
export function isDraftSession(session: ChatSession): boolean {
  return !session.agentId && session.activeAgentIds.length === 0 && session.messages.length === 0;
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

// Every agent actually active in a session right now — the dedicated
// "Chat with X" session marker (session.agentId) and the @mention/drag
// roster (session.activeAgentIds) are two different ways an agent ends up
// in a chat, but for "who should reply" purposes they're the same thing.
function resolveActiveAgents(session: ChatSession | undefined, agents: Agent[]): Agent[] {
  if (!session) return [];
  return agents.filter((agent) => agent.id === session.agentId || session.activeAgentIds.includes(agent.id));
}

// Owns the assistant's open/closed state and every chat session's
// content. Lives here (not inside AIAssistantWindow) so it survives
// collapsing the window back to the icon — collapsing minimizes, it
// doesn't reset the conversation. Dock/drag/resize/placement state is a
// separate, unrelated concern — see AIAssistant.windowDock.script.ts.
export function useAIAssistant() {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([makeNewSession(), ...HISTORY_FIXTURES]);
  const [activeSessionId, setActiveSessionId] = useState(NEW_SESSION_ID);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  // Refreshes the roster from disk every time the window opens — cheap,
  // and good enough to pick up an agent created/edited on the Agents page
  // without needing a live cross-page store.
  useEffect(() => {
    if (phase !== "open") return;
    listAgents().then(setAgents);
  }, [phase]);

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

  // Switches to the existing draft session if there already is one
  // (never piles up multiple empty "New chat" entries), otherwise creates
  // a fresh one and switches to it.
  function startNewChat() {
    const existingDraft = sessions.find(isDraftSession);
    if (existingDraft) {
      setActiveSessionId(existingDraft.id);
      return;
    }
    const session = makeNewSession(crypto.randomUUID());
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
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
    const session = sessions.find((candidate) => candidate.id === sessionIdAtSend);

    const alreadyActive = resolveActiveAgents(session, agents);
    const mentioned = findMentionedAgents(text, agents);
    const resolvedActive = [...alreadyActive, ...mentioned.filter((agent) => !alreadyActive.some((a) => a.id === agent.id))];

    // There is no default/generic assistant in this app — a message only
    // ever gets a real reply once exactly one real agent is active in
    // this chat (drag one in, click one, or @mention one). Multiple
    // agents replying together is a later increment (see this update's
    // wiki.md) — for now, more than one active agent blocks sending
    // rather than silently picking one or falling back to a generic voice.
    if (resolvedActive.length !== 1) {
      appendMessageToActive({
        id: crypto.randomUUID(),
        role: "system",
        text:
          resolvedActive.length === 0
            ? "Add an agent to this chat first — drag one in from the roster, click one, or type @ to mention one."
            : "Only one agent can reply at a time right now — remove one before sending.",
      });
      return;
    }
    const activeAgent = resolvedActive[0];

    appendMessageToActive({ id: crypto.randomUUID(), role: "user", text });
    setComposerValue("");
    for (const agent of mentioned) {
      addAgentToActiveChat(agent.id);
    }

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
      const reply = await askAgent(jobId, text, activeAgent.instructions, activeAgent.id, session?.claudeSessionId);
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
    const agent = agents.find((candidate) => candidate.id === agentId);
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
    const agent = agents.find((candidate) => candidate.id === agentId);
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
    startNewChat,
    composerValue,
    setComposerValue,
    sendMessage,
    isSending,
    agents,
    selectAgent,
    addAgentToActiveChat,
    removeAgentFromActiveChat,
  };
}
