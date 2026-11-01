import { useEffect, useRef, useState } from "react";
import { askAgent, onAskAgentProgress } from "@/lib/assistant/askAgent";
import { listAgents, type Agent } from "@/lib/agents";
import { buildAgentTurnInput, listSessions, saveSession, deleteSessionFile } from "@/lib/chat";
import type { ChatMessage, ChatMessageRole, ChatSession } from "@/lib/chat";

export type AssistantPhase = "closed" | "open" | "closing";
export type { ChatMessage, ChatMessageRole, ChatSession, Agent };

const NEW_SESSION_ID = "current";

function makeNewSession(id: string = NEW_SESSION_ID): ChatSession {
  const now = new Date().toISOString();
  return {
    id,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    activeAgentIds: [],
    claudeSessionIds: {},
    isDraft: true,
  };
}

// A freshly-opened chat with nobody picked yet and nothing said yet —
// AIAssistantWindow shows the AgentPicker instead of the message list for
// one of these, and HistoryList hides it (it isn't a real past
// conversation, just the current "pick someone" prompt). Deliberately an
// explicit flag rather than inferring "no agent + no messages" from
// shape — a real, legitimately-empty session would otherwise be
// indistinguishable from an actual draft and vanish from history too.
// Draft sessions are also never written to disk — see src/lib/chat/storage.ts.
export function isDraftSession(session: ChatSession): boolean {
  return session.isDraft === true;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Which agents a message text @mentions — matches "@" + an agent's exact
// name at a word boundary (so "@Coachella" doesn't match "Coach"). Used
// both to resolve who replies to a message (see resolveResponders below)
// and (with its own copy in Message.script.ts, which needs segment
// positions rather than a plain list) to render the mention as a styled
// tag.
export function findMentionedAgents(text: string, agents: Agent[]): Agent[] {
  return agents.filter((agent) => new RegExp(`@${escapeRegExp(agent.name)}\\b`).test(text));
}

// Every agent actually active in a session right now — the dedicated
// "Chat with X" session marker (session.agentId) and the @mention/drag
// roster (session.activeAgentIds) are two different ways an agent ends up
// in a chat. Exported: used to resolve a session's avatar in
// HistoryListItem and the "who am I talking to" profile shown in
// MessageList/Message.
export function resolveActiveAgents(session: ChatSession | undefined, agents: Agent[]): Agent[] {
  if (!session) return [];
  return agents.filter((agent) => agent.id === session.agentId || session.activeAgentIds.includes(agent.id));
}

// Who replies to a given message: whoever it @mentions, else the single
// agent this chat is dedicated to, else — only for a chat that's neither
// dedicated nor unambiguous (e.g. 2+ agents dragged in, nobody tagged) —
// nobody, so sending blocks instead of guessing who should answer.
function resolveResponders(session: ChatSession, text: string, agents: Agent[]): Agent[] {
  const mentioned = findMentionedAgents(text, agents);
  if (mentioned.length > 0) return mentioned;
  const dedicated = agents.find((agent) => agent.id === session.agentId);
  if (dedicated) return [dedicated];
  const active = resolveActiveAgents(session, agents);
  return active.length === 1 ? active : [];
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
  const [sessions, setSessions] = useState<ChatSession[]>([makeNewSession()]);
  const sessionsLoadStarted = useRef(false);
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

  // Loads every real past conversation from disk the first time the
  // window opens — the in-memory draft from useState above is just a
  // placeholder until this resolves, so there's never a render with no
  // active session at all.
  useEffect(() => {
    if (phase !== "open" || sessionsLoadStarted.current) return;
    sessionsLoadStarted.current = true;
    listSessions().then((loaded) => {
      const ordered = [...loaded].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setSessions((current) => {
        const draft = current.find(isDraftSession) ?? makeNewSession(crypto.randomUUID());
        return [draft, ...ordered];
      });
    });
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

  // Applies `updater` to one session (stamping updatedAt) and persists it
  // unless it's a draft — the one place every real mutation below funnels
  // through, so "change a session" and "save it" can never drift apart.
  function updateAndPersistSession(id: string, updater: (session: ChatSession) => ChatSession) {
    setSessions((current) => {
      const next = current.map((session) =>
        session.id === id ? updater({ ...session, updatedAt: new Date().toISOString() }) : session,
      );
      const updated = next.find((session) => session.id === id);
      if (updated && !isDraftSession(updated)) void saveSession(updated);
      return next;
    });
  }

  function appendMessageToSession(sessionId: string, message: ChatMessage) {
    updateAndPersistSession(sessionId, (session) => ({ ...session, messages: [...session.messages, message] }));
  }

  // Grows one message's text in place as streamed deltas arrive —
  // deliberately not persisted on every call (that would be a disk write
  // per token); see finalizeAgentReply for the one save that matters.
  function updateMessageInSession(sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, messages: session.messages.map((message) => (message.id === messageId ? updater(message) : message)) }
          : session,
      ),
    );
  }

  // The one save that matters for a reply: final text + this agent's own
  // resumed CLI session id, in the same write.
  function finalizeAgentReply(sessionId: string, messageId: string, agentId: string, text: string, claudeSessionId: string) {
    updateAndPersistSession(sessionId, (session) => ({
      ...session,
      claudeSessionIds: { ...session.claudeSessionIds, [agentId]: claudeSessionId },
      messages: session.messages.map((message) => (message.id === messageId ? { ...message, text } : message)),
    }));
  }

  function failAgentReply(sessionId: string, messageId: string, error: unknown) {
    updateAndPersistSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...message, role: "system", text: `Couldn't reach Claude: ${error}` } : message,
      ),
    }));
  }

  // Dispatches one agent's reply to the message just sent — its own
  // placeholder bubble, its own streamed jobId, its own resumed CLI
  // session. Multiple responders to one message each get their own call
  // to this, run concurrently (see sendMessage) — nobody waits on anybody
  // else's reply within the same turn.
  async function dispatchAgentReply(sessionId: string, agent: Agent, session: ChatSession, transcript: ChatMessage[]) {
    const input = buildAgentTurnInput(session, agent, agents, transcript);
    const replyId = crypto.randomUUID();
    appendMessageToSession(sessionId, {
      id: replyId,
      role: "assistant",
      agentId: agent.id,
      text: "",
      createdAt: new Date().toISOString(),
    });

    const jobId = crypto.randomUUID();
    const unlisten = await onAskAgentProgress((progress) => {
      if (progress.jobId !== jobId) return;
      updateMessageInSession(sessionId, replyId, (message) => ({ ...message, text: message.text + progress.delta }));
    });

    try {
      const reply = await askAgent(jobId, input, agent.instructions, agent.id, session.claudeSessionIds[agent.id]);
      // The streamed-in text above is provisional (deltas could in theory
      // drop or reorder); the CLI's final `result` text is authoritative,
      // so it always wins here.
      finalizeAgentReply(sessionId, replyId, agent.id, reply.text || "(no reply)", reply.sessionId);
    } catch (error) {
      failAgentReply(sessionId, replyId, error);
    } finally {
      unlisten();
    }
  }

  async function sendMessage() {
    const text = composerValue.trim();
    if (!text || isSending) return;
    const sessionIdAtSend = activeSessionId;
    const session = sessions.find((candidate) => candidate.id === sessionIdAtSend);
    if (!session) return;
    bringSessionToFront(sessionIdAtSend);

    const responders = resolveResponders(session, text, agents);
    if (responders.length === 0) {
      const active = resolveActiveAgents(session, agents);
      appendMessageToSession(sessionIdAtSend, {
        id: crypto.randomUUID(),
        role: "system",
        text:
          active.length === 0
            ? "Add an agent to this chat first — drag one in from the roster, click one, or type @ to mention one."
            : "More than one agent is in this chat — tag who you're talking to with @.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    appendMessageToSession(sessionIdAtSend, userMessage);
    setComposerValue("");
    for (const agent of responders) addAgentToSession(sessionIdAtSend, agent.id);

    const transcriptSoFar = [...session.messages, userMessage];
    setIsSending(true);
    try {
      await Promise.all(responders.map((agent) => dispatchAgentReply(sessionIdAtSend, agent, session, transcriptSoFar)));
    } finally {
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
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat with ${agent.name}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      activeAgentIds: [],
      claudeSessionIds: {},
      agentId,
    };
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    void saveSession(session);
  }

  // Right-click "Delete chat" in HistoryList. If the deleted session was
  // the active one, falls back to whatever is now first — the most
  // recently used remaining chat — or a fresh draft if none are left.
  function deleteSession(id: string) {
    void deleteSessionFile(id);
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

  function addAgentToSession(sessionId: string, agentId: string) {
    const agent = agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    updateAndPersistSession(sessionId, (session) => {
      if (session.activeAgentIds.includes(agentId) || session.agentId === agentId) return session;
      return {
        ...session,
        activeAgentIds: [...session.activeAgentIds, agentId],
        messages: [
          ...session.messages,
          { id: crypto.randomUUID(), role: "system", text: `${agent.name} added to the conversation`, createdAt: new Date().toISOString() },
        ],
      };
    });
  }

  function addAgentToActiveChat(agentId: string) {
    addAgentToSession(activeSessionId, agentId);
  }

  function removeAgentFromActiveChat(agentId: string) {
    updateAndPersistSession(activeSessionId, (session) => ({
      ...session,
      activeAgentIds: session.activeAgentIds.filter((id) => id !== agentId),
    }));
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
