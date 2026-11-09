import { useEffect, useRef, useState } from "react";
import { askAgent, onAskAgentProgress } from "@/lib/assistant/askAgent";
import { nameChat } from "@/lib/assistant/nameChat";
import { attachToPendingReply, beginPendingReply, endPendingReply, growPendingReply, isReplyPending } from "@/lib/assistant/pendingReplies";
import { listAgents, type Agent } from "@/lib/agents";
import { buildAgentTurnInput, listSessions, saveSession, deleteSessionFile } from "@/lib/chat";
import type { ChatMessage, ChatMessageRole, ChatSession } from "@/lib/chat";
import { listRecords, type RecordSummary } from "@/lib/records";
import { listSessions as listTrainingSessions, type SessionSummary as TrainingSessionSummary } from "@/lib/training";
import { useActiveTaggedResource } from "@/lib/mcp/activeTaggedResource";
import { useActiveSpace } from "@/lib/spaces";
import { onMcpPermissionRequest, onMcpTagUsed, respondToMcpPermission, syncMcpTags } from "@/lib/mcp/bridge";
import { promoteTag, removeTag as removeTagFromList, withSuggestedTag } from "@/lib/mcp/tags";
import type { ChatTag, PermissionDecision, PermissionRequestStatus, TaggedResourceKind } from "@/lib/mcp/types";

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
    claudeSessionIds: {},
    contextUsage: {},
    isDraft: true,
    tags: [],
    alwaysAllowedResources: [],
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

const STUCK_REPLY_TEXT = "Didn't get a reply — try asking again.";

// An empty-text assistant message is dispatchAgentReply's own placeholder
// (see below), persisted to disk the instant a reply starts — streamed
// text and the final result only ever land in memory/disk once the model
// call actually finishes (finalizeAgentReply) or fails (failAgentReply).
// The request itself survives the component that started it unmounting
// (e.g. switching to a different Training Room session mid-reply, or
// leaving Training Room entirely) — see src/lib/assistant/pendingReplies —
// so a message still showing empty text on a fresh load is only genuinely
// abandoned (e.g. the app itself relaunched mid-reply, wiping every
// in-memory registry) if `isReplyPending` says nothing is still actively
// receiving it. Anything still pending is left exactly as-is here — the
// load effect below reattaches to it live instead, rather than this
// function ever touching it.
function reconcileStuckReply(message: ChatMessage): ChatMessage {
  if (message.role !== "assistant" || message.text !== "" || isReplyPending(message.id)) return message;
  return { ...message, role: "system", text: STUCK_REPLY_TEXT };
}

// Returns sessions unchanged by reference unless one of their messages
// actually needed reconciling — callers rely on that reference equality
// to know which sessions to re-persist.
function reconcileStuckReplies(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((session) => {
    if (!session.messages.some((message) => message.role === "assistant" && message.text === "" && !isReplyPending(message.id))) {
      return session;
    }
    return { ...session, messages: session.messages.map(reconcileStuckReply) };
  });
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

// The agent this chat is dedicated to, if any — exported for
// HistoryListItem/MessageList's "who am I talking to" display.
export function resolveDedicatedAgent(session: ChatSession | undefined, agents: Agent[]): Agent | undefined {
  if (!session) return undefined;
  return agents.find((agent) => agent.id === session.agentId);
}

// Every distinct agent that has actually replied in a session —
// HistoryListItem's real "who's in this conversation" signal, computed
// from message authorship rather than any separately-tracked roster.
export function resolveRespondedAgents(session: ChatSession | undefined, agents: Agent[]): Agent[] {
  if (!session) return [];
  const seen = new Set<string>();
  const responders: Agent[] = [];
  for (const message of session.messages) {
    if (message.role !== "assistant" || !message.agentId || seen.has(message.agentId)) continue;
    const agent = agents.find((candidate) => candidate.id === message.agentId);
    if (!agent) continue;
    seen.add(agent.id);
    responders.push(agent);
  }
  return responders;
}

// Who replies to a given message: whoever it @mentions, else the single
// agent this chat is dedicated to, else nobody — sending blocks rather
// than guessing who should answer.
function resolveResponders(session: ChatSession, text: string, agents: Agent[]): Agent[] {
  const mentioned = findMentionedAgents(text, agents);
  if (mentioned.length > 0) return mentioned;
  const dedicated = resolveDedicatedAgent(session, agents);
  return dedicated ? [dedicated] : [];
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
// `storageRoot` scopes disk reads/writes to something narrower than the
// whole Space's chats/ dir — undefined everywhere except AITrainerPane
// (see src/lib/training's trainerChatsDir), which passes its own training
// session's folder so its history never mixes with the floating widget/
// ChatPage's, or another training session's. `trainingSessionId` is the
// same AITrainerPane-only case, threaded into every real model call so
// it alone gets get_roleplay_transcript access (see askAgent.ts).
export function useAIAssistant(storageRoot?: string, trainingSessionId?: string) {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([makeNewSession()]);
  const sessionsLoadStarted = useRef(false);
  const [activeSessionId, setActiveSessionId] = useState(NEW_SESSION_ID);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeSpace = useActiveSpace();

  // Refreshes the roster from disk every time the window opens — cheap,
  // and good enough to pick up an agent created/edited on the Agents page
  // without needing a live cross-page store.
  useEffect(() => {
    if (phase !== "open") return;
    listAgents().then(setAgents);
  }, [phase, activeSpace?.id]);

  // Same refresh-on-open as agents above — TagChip needs a record's
  // title/status to render anything more useful than a bare id.
  const [recordSummaries, setRecordSummaries] = useState<RecordSummary[]>([]);
  useEffect(() => {
    if (phase !== "open") return;
    listRecords().then(setRecordSummaries);
  }, [phase, activeSpace?.id]);

  // Same job, for Training Room sessions — the second real taggable
  // resource kind TagChip needs a title/discipline for.
  const [trainingSessionSummaries, setTrainingSessionSummaries] = useState<TrainingSessionSummary[]>([]);
  useEffect(() => {
    if (phase !== "open") return;
    listTrainingSessions().then(setTrainingSessionSummaries);
  }, [phase, activeSpace?.id]);

  // Switching Spaces must drop every bit of this Space's in-memory state —
  // agents, sessions, records — since the new Space is a genuinely
  // separate set of all three, not a filtered view of the same data. This
  // window is a global singleton (mounted once in layout.tsx, outlives
  // route changes), so it can't rely on a remount to reset itself the way
  // a page component would. Resetting during render (React's documented
  // "adjust state when a prop changes" pattern), not inside a useEffect —
  // an effect body calling setState synchronously is exactly the
  // cascading-render footgun react-hooks/set-state-in-effect exists to
  // catch; comparing against a ref during render re-renders once, cleanly,
  // with the reset state already applied. Resetting sessionsLoadStarted
  // lets the sessions effect below reload exactly once for the new Space,
  // same "once per (open, Space)" shape it already had for "once per
  // open".
  const lastSeenSpaceIdRef = useRef(activeSpace?.id);
  if (activeSpace && activeSpace.id !== lastSeenSpaceIdRef.current) {
    lastSeenSpaceIdRef.current = activeSpace.id;
    sessionsLoadStarted.current = false;
    setAgents([]);
    setRecordSummaries([]);
    setTrainingSessionSummaries([]);
    setSessions([makeNewSession()]);
    setActiveSessionId(NEW_SESSION_ID);
  }

  // Loads every real past conversation from disk the first time the
  // window opens (and again whenever the active Space changes — see
  // above) — the in-memory draft from useState above is just a
  // placeholder until this resolves, so there's never a render with no
  // active session at all.
  useEffect(() => {
    if (phase !== "open" || sessionsLoadStarted.current) return;
    sessionsLoadStarted.current = true;
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

    listSessions(storageRoot).then((loaded) => {
      if (cancelled) return;
      const ordered = [...loaded].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      const reconciled = reconcileStuckReplies(ordered);
      reconciled.forEach((session, index) => {
        if (session !== ordered[index]) void saveSession(session, storageRoot);
      });
      setSessions((current) => {
        const existingDraft = current.find(isDraftSession);
        // The in-memory placeholder draft always starts life with id
        // NEW_SESSION_ID ("current") before anything's loaded from disk
        // (see the useState above). If an *earlier* app launch ever
        // converted that exact draft into a real chat (picking an agent
        // keeps the draft's own id — see startChatWithAgent below) and
        // saved it, this launch's fresh placeholder collides with that
        // same id once `ordered` loads. Two ChatSession objects would
        // then share one id — every update keyed by id
        // (`current.map(s => s.id === id ? ... : s)`) matches both at
        // once, so they'd visibly "shine together" in the history list
        // for every message/tag change in either. Found live, not
        // theoretical — regenerate the draft's id instead of reusing it
        // whenever this collision is actually possible.
        const collides = existingDraft && reconciled.some((session) => session.id === existingDraft.id);
        const draft = existingDraft && !collides ? existingDraft : makeNewSession(crypto.randomUUID());
        return [draft, ...reconciled];
      });

      // Reattach to every reply that's still genuinely in flight (see
      // src/lib/assistant/pendingReplies) — paints whatever text it's
      // already accumulated immediately, no flash back to "thinking"
      // even though this is a brand-new hook instance, then keeps this
      // message updating live as further deltas (and the eventual
      // finish/fail) arrive, exactly as if this instance had sent it
      // itself. This is what lets leaving Training Room entirely, or
      // switching to a different session/chat, never lose or falsely
      // fail a reply that's genuinely still on its way.
      for (const session of reconciled) {
        for (const message of session.messages) {
          if (message.role !== "assistant") continue;
          const attached = attachToPendingReply(message.id, (update) => {
            updateMessageInSession(session.id, message.id, (current) => ({
              ...current,
              text: update.text,
              role: update.role,
            }));
          });
          if (!attached) continue;
          updateMessageInSession(session.id, message.id, (current) => ({ ...current, text: attached.text }));
          unsubscribers.push(attached.unsubscribe);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [phase, activeSpace?.id, storageRoot]);

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

  // The "suggested" tag is never written to a session's stored `tags` —
  // it's a pure, render-time reflection of wherever the user currently
  // is (Performance Review or, since this was generalized, Training
  // Room — see src/lib/mcp/activeTaggedResource.ts), re-derived every
  // render rather than synced via an effect (an effect that calls
  // setState in response to an external store is exactly the kind of
  // "derived state" React's docs recommend computing during render
  // instead). Only a real, stored "active" tag (one the AI has actually
  // read — see Phase C) ever lives in session.tags.
  const activeResource = useActiveTaggedResource();
  // Dismissing a *suggested* chip can't remove something that was never
  // stored — this is what makes "×" on a not-yet-active suggestion stick
  // instead of reappearing on the next render. Keyed per session (tags
  // are scoped per chat, per the user's own choice), reset for free the
  // moment the user navigates to a different resource.
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, { kind: TaggedResourceKind; id: string }>>(
    {},
  );
  const dismissed = dismissedSuggestions[activeSessionId];
  const suggestedResource =
    activeResource && !(dismissed && dismissed.kind === activeResource.kind && dismissed.id === activeResource.id)
      ? activeResource
      : null;
  const visibleTags: ChatTag[] = withSuggestedTag(activeSession.tags, suggestedResource);

  // Pushes the active session's tag/always-allow state to the Rust
  // bridge (src-tauri/src/mcp/bridge.rs) — a real external-system sync,
  // not a setState call, so it belongs in an effect. Includes the
  // computed "suggested" tag, not just what's stored, since that's what
  // actually grants silent access to a not-yet-active suggestion (see
  // mcp/permission.rs). Only the active session needs to stay live here —
  // sendMessage captures its target session synchronously before this
  // could change out from under it.
  useEffect(() => {
    void syncMcpTags(activeSessionId, visibleTags, activeSession.alwaysAllowedResources);
  }, [activeSessionId, visibleTags, activeSession.alwaysAllowedResources]);

  // Two long-lived subscriptions to the bridge's events — mount once,
  // route by the sessionId each event itself carries (never assumed to
  // be the currently active session; a reply the user has since
  // navigated away from can still trigger either of these).
  useEffect(() => {
    const unlistenPromise = onMcpPermissionRequest((event) => {
      appendMessageToSession(event.sessionId, {
        id: crypto.randomUUID(),
        role: "system",
        text: "",
        createdAt: new Date().toISOString(),
        agentId: event.agentId,
        permissionRequest: {
          requestId: event.requestId,
          agentId: event.agentId,
          resourceKind: event.resourceKind,
          resourceId: event.resourceId,
          resourceTitle: event.resourceTitle,
          document: event.document,
          status: "pending",
        },
      });
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
    // Mount once — appendMessageToSession is stable in behavior (reads
    // fresh state via setSessions's functional form) even though it's
    // redefined every render; re-subscribing on every render would be
    // wrong, not just unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlistenPromise = onMcpTagUsed((event) => {
      updateAndPersistSession(event.sessionId, (session) => ({
        ...session,
        tags: promoteTag(session.tags, event.resourceKind, event.resourceId),
      }));
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
    // Mount once, same reasoning as the onMcpPermissionRequest subscription
    // above — updateAndPersistSession now also closes over storageRoot
    // (stable for this hook instance's whole lifetime; AITrainerPane
    // remounts on session change rather than ever passing a new one in),
    // re-subscribing whenever it's redefined would be wrong, not just
    // unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The Decline/Allow/Always Allow buttons on a PermissionRequest card.
  // Resolves the bridge's blocked tool call immediately and, separately,
  // collapses the card by updating its stored status — found by message
  // id, not the active session, for the same reason the event listeners
  // above don't assume it either.
  function respondToPermission(messageId: string, decision: PermissionDecision) {
    const owningSession = sessions.find((session) => session.messages.some((message) => message.id === messageId));
    const request = owningSession?.messages.find((message) => message.id === messageId)?.permissionRequest;
    if (!owningSession || !request) return;
    void respondToMcpPermission(request.requestId, decision);
    const status: PermissionRequestStatus =
      decision === "decline" ? "declined" : decision === "allow" ? "allowed" : "always-allowed";
    updateAndPersistSession(owningSession.id, (session) => ({
      ...session,
      alwaysAllowedResources:
        decision === "always-allow"
          ? [...session.alwaysAllowedResources, { resourceKind: request.resourceKind, resourceId: request.resourceId }]
          : session.alwaysAllowedResources,
      messages: session.messages.map((message) =>
        message.id === messageId && message.permissionRequest
          ? { ...message, permissionRequest: { ...message.permissionRequest, status } }
          : message,
      ),
    }));
  }

  // The × button on a tag chip. A stored (active) tag is actually
  // removed from the session; a merely-suggested one (never stored) is
  // just dismissed for as long as the user stays on that same resource.
  function removeTag(resourceKind: TaggedResourceKind, resourceId: string) {
    const isStored = activeSession.tags.some((tag) => tag.resourceKind === resourceKind && tag.resourceId === resourceId);
    if (isStored) {
      updateAndPersistSession(activeSessionId, (session) => ({
        ...session,
        tags: removeTagFromList(session.tags, resourceKind, resourceId),
      }));
    } else {
      setDismissedSuggestions((current) => ({ ...current, [activeSessionId]: { kind: resourceKind, id: resourceId } }));
    }
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
      if (updated && !isDraftSession(updated)) void saveSession(updated, storageRoot);
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
  // resumed CLI session id + how full that session's context is now, all
  // in the same write.
  function finalizeAgentReply(
    sessionId: string,
    messageId: string,
    agentId: string,
    text: string,
    claudeSessionId: string,
    contextTokens: number,
    contextWindow: number,
  ) {
    updateAndPersistSession(sessionId, (session) => ({
      ...session,
      claudeSessionIds: { ...session.claudeSessionIds, [agentId]: claudeSessionId },
      contextUsage: { ...session.contextUsage, [agentId]: { tokens: contextTokens, window: contextWindow } },
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
    // Registered independently of this component instance (see
    // src/lib/assistant/pendingReplies) — the rest of this function keeps
    // running and persisting correctly to disk even if whatever mounted
    // component called sendMessage unmounts before it finishes (switching
    // Training Room sessions, leaving Training Room entirely, switching
    // to a different chat). This registry is what lets a later, brand-new
    // instance reattach to the live reply instead of either freezing on
    // an empty bubble or wrongly declaring it failed.
    beginPendingReply(replyId);

    const jobId = crypto.randomUUID();
    const unlisten = await onAskAgentProgress((progress) => {
      if (progress.jobId !== jobId) return;
      growPendingReply(replyId, progress.delta);
      updateMessageInSession(sessionId, replyId, (message) => ({ ...message, text: message.text + progress.delta }));
    });

    try {
      const reply = await askAgent(
        jobId,
        input,
        agent.instructions,
        agent.id,
        session.claudeSessionIds[agent.id],
        sessionId,
        agent.homeSpaceFolder,
        activeSpace?.folderName ?? agent.homeSpaceFolder,
        trainingSessionId,
      );
      // The streamed-in text above is provisional (deltas could in theory
      // drop or reorder); the CLI's final `result` text is authoritative,
      // so it always wins here.
      const finalText = reply.text || "(no reply)";
      finalizeAgentReply(
        sessionId,
        replyId,
        agent.id,
        finalText,
        reply.sessionId,
        reply.contextTokens,
        reply.contextWindow,
      );
      endPendingReply(replyId, finalText, "assistant");
    } catch (error) {
      failAgentReply(sessionId, replyId, error);
      endPendingReply(replyId, `Couldn't reach Claude: ${error}`, "system");
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
      appendMessageToSession(sessionIdAtSend, {
        id: crypto.randomUUID(),
        role: "system",
        text: "Add an agent to this chat first — click one from the sidebar, or type @ to mention one.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    // A chat picked-but-not-yet-messaged (agentId set by startChatWithAgent,
    // still isDraft) only becomes a real, persisted, in-history conversation
    // once its first message actually sends — flipping isDraft off in the
    // very same update that appends the message, rather than the moment an
    // agent was picked, is what keeps an abandoned "New chat" from ever
    // hitting disk or History at all.
    const isFirstMessage = isDraftSession(session);
    if (isFirstMessage) {
      updateAndPersistSession(sessionIdAtSend, (current) => ({
        ...current,
        isDraft: false,
        messages: [...current.messages, userMessage],
      }));
      // Auto-name the chat off its first message, the same beat Claude's
      // own chat UI and ChatGPT do it at — a cheap one-shot call (see
      // nameChat/name_chat), never blocking the send itself and never
      // overriding a title the user types in later (this only ever fires
      // once, right here, on a session's very first message).
      void nameChat(text)
        .then((title) => updateAndPersistSession(sessionIdAtSend, (current) => ({ ...current, title })))
        .catch(() => {
          // No worse off than before — keeps whichever default title
          // (record- or agent-based, see startChatWithAgent/selectAgent)
          // the session already had.
        });
    } else {
      appendMessageToSession(sessionIdAtSend, userMessage);
    }
    setComposerValue("");

    const transcriptSoFar = [...session.messages, userMessage];
    setIsSending(true);
    try {
      await Promise.all(responders.map((agent) => dispatchAgentReply(sessionIdAtSend, agent, session, transcriptSoFar)));
    } finally {
      setIsSending(false);
    }
  }

  // The title a brand-new chat with `agent` should start with — the
  // record "we're talking about" (whatever's tagged/suggested for the
  // session being replaced, since that's computed off activeSessionId and
  // this always runs while the draft/pre-pick session is still active) if
  // there is one, else the session's own agent identity. Auto-naming (see
  // sendMessage/nameChat) overwrites this once the first message sends —
  // this is only what shows up until then, or if that call fails.
  function resolveDefaultTitle(agent: Agent): string {
    const tag = visibleTags[0];
    const title =
      tag?.resourceKind === "performanceReview"
        ? recordSummaries.find((candidate) => candidate.id === tag.resourceId)?.title
        : tag?.resourceKind === "trainingSession"
          ? trainingSessionSummaries.find((candidate) => candidate.id === tag.resourceId)?.name
          : undefined;
    return title || `Chat with ${agent.name}`;
  }

  // Picking an agent from the sidebar strip switches to the one dedicated
  // session with that agent, creating it on first pick.
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
      title: resolveDefaultTitle(agent),
      createdAt: now,
      updatedAt: now,
      messages: [],
      claudeSessionIds: {},
      contextUsage: {},
      agentId,
      tags: [],
      alwaysAllowedResources: [],
    };
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    void saveSession(session, storageRoot);
  }

  // AgentPicker's handler, always called with the active session being
  // the current draft (it only renders for one — see the agentId check in
  // AIAssistantWindow). Deliberately distinct from selectAgent: starting a
  // *new* chat with an agent should always create another independent
  // conversation with them, even if you already have one or more past
  // chats with that same agent — reusing an existing one here was the bug
  // where "New chat" + picking an agent you'd talked to before just
  // reopened the old chat instead of starting a fresh one. Converts the
  // draft in place (keeps its id) rather than creating a separate session
  // and abandoning the draft as an orphan.
  //
  // Deliberately leaves `isDraft: true` and never calls saveSession —
  // picking an agent only switches the chat column's view (AgentPicker →
  // Composer, driven by `agentId` now being set), it isn't "real" enough
  // yet to hit disk or show in History. That only happens once a message
  // actually sends (see sendMessage) — otherwise navigating away and back
  // (or just closing the window) would leave a zero-message "Chat with X"
  // behind forever.
  function startChatWithAgent(agentId: string) {
    const agent = agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    const draftId = activeSessionId;
    setSessions((current) =>
      current.map((session) =>
        session.id === draftId ? { ...session, title: resolveDefaultTitle(agent), agentId } : session,
      ),
    );
  }

  // Right-click "Delete chat" in HistoryList. If the deleted session was
  // the active one, falls back to whatever is now first — the most
  // recently used remaining chat — or a fresh draft if none are left.
  function deleteSession(id: string) {
    void deleteSessionFile(id, storageRoot);
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

  // Right-click "Rename" in HistoryList, committed from HistoryListItem's
  // own inline edit (same click-to-edit idiom as Hero's record title).
  // Plain text replacement through the same persist funnel as every other
  // mutation — a blank/whitespace-only submission is a no-op rather than
  // leaving a session with an empty title.
  function renameSession(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateAndPersistSession(id, (session) => ({ ...session, title: trimmed }));
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
  };
}
