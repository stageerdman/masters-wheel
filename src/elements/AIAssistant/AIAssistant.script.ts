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
  /** Set only by makeNewSession — see isDraftSession. */
  isDraft?: boolean;
};

export type { Agent };

const NEW_SESSION_ID = "current";

function makeNewSession(id: string = NEW_SESSION_ID): ChatSession {
  return { id, title: "New chat", relativeDate: "Now", messages: [], activeAgentIds: [], isDraft: true };
}

// A freshly-opened chat with nobody picked yet and nothing said yet —
// AIAssistantWindow shows the AgentPicker instead of the message list for
// one of these, and HistoryList hides it (it isn't a real past
// conversation, just the current "pick someone" prompt). Deliberately an
// explicit flag rather than inferring "no agent + no messages" from
// shape — a real, legitimately-empty session (e.g. a fixture with no
// messages yet) would otherwise be indistinguishable from an actual
// draft and vanish from history too.
export function isDraftSession(session: ChatSession): boolean {
  return session.isDraft === true;
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
// Exported: also used to resolve a session's avatar in HistoryListItem and
// the "who am I talking to" profile shown in MessageList/Message.
export function resolveActiveAgents(session: ChatSession | undefined, agents: Agent[]): Agent[] {
  if (!session) return [];
  return agents.filter((agent) => agent.id === session.agentId || session.activeAgentIds.includes(agent.id));
}

// Agents ordered by how recently they were chatted with — the order
// `sessions` is already in (see bringSessionToFront below, called
// whenever a chat is started/resumed/sent in), read off each session's
// dedicated agentId. An agent never chatted with yet falls back to the
// end, in its original roster order. Used by Sidebar's AgentStrip only —
// everywhere else (the @mention picker, AgentPicker) keeps the plain
// roster order.
export function orderAgentsByRecency(agents: Agent[], sessions: ChatSession[]): Agent[] {
  const seen = new Set<string>();
  const recent: Agent[] = [];
  for (const session of sessions) {
    if (!session.agentId || seen.has(session.agentId)) continue;
    const agent = agents.find((candidate) => candidate.id === session.agentId);
    if (!agent) continue;
    seen.add(agent.id);
    recent.push(agent);
  }
  const rest = agents.filter((agent) => !seen.has(agent.id));
  return [...recent, ...rest];
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

  // Moves a session to the front of `sessions` — this array's order is
  // what orderAgentsByRecency and (for free) HistoryList's own display
  // order read as "most recently used first". Called when a chat is
  // started/resumed via its agent and whenever a message is actually
  // sent, deliberately not on every passive history click (selectSession
  // above) — browsing past chats shouldn't reshuffle the list under you.
  function bringSessionToFront(id: string) {
    setSessions((current) => {
      const index = current.findIndex((session) => session.id === id);
      if (index <= 0) return current;
      const next = [...current];
      const [session] = next.splice(index, 1);
      next.unshift(session);
      return next;
    });
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
    bringSessionToFront(sessionIdAtSend);

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
      bringSessionToFront(existing.id);
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

  // Right-click "Delete chat" in HistoryList. If the deleted session was
  // the active one, falls back to whatever is now first — the most
  // recently used remaining chat — or a fresh draft if none are left.
  function deleteSession(id: string) {
    setSessions((current) => {
      const next = current.filter((session) => session.id !== id);
      if (activeSessionId === id) {
        if (next.length > 0) {
          setActiveSessionId(next[0].id);
          return next;
        }
        const draft = makeNewSession(crypto.randomUUID());
        setActiveSessionId(draft.id);
        return [draft, ...next];
      }
      return next;
    });
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
    deleteSession,
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
