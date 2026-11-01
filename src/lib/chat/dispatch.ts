// What actually gets sent as one agent's turn via `claude -p` — never just
// the raw human message, and never another agent's replies replayed as if
// they were this agent's own. Claude Code's `--resume` already carries
// forward everything *this* agent said/received in its own prior turns in
// this session, so the only thing worth sending here is what happened
// *since* this agent's last reply: the other speakers' messages in
// between, speaker-labeled, ending in the message that was just sent. An
// agent that has never replied in this session yet has no native history
// to resume, so it gets the whole transcript so far instead of a delta —
// see AGENTS-ENGINE's wiki.md for why every agent needs the full shared
// transcript the first time it joins.
import type { Agent } from "@/lib/agents";
import type { ChatMessage, ChatSession } from "./types";

export function buildAgentTurnInput(
  session: ChatSession,
  agent: Agent,
  agents: Agent[],
  messagesUpToNow: ChatMessage[],
): string {
  const hasResumedSession = Boolean(session.claudeSessionIds[agent.id]);
  const lastOwnReplyIndex = hasResumedSession
    ? findLastIndex(messagesUpToNow, (message) => message.role === "assistant" && message.agentId === agent.id)
    : -1;
  const window = messagesUpToNow.slice(lastOwnReplyIndex + 1);
  const relevant = window.filter(
    (message) => message.role !== "system" && !(message.role === "assistant" && message.agentId === agent.id),
  );

  // The common case — a dedicated chat, nobody else has spoken since this
  // agent's last reply — sends exactly the plain message, same as before
  // mention-addressed multi-agent existed. Labeling only kicks in once
  // there's actually more than one speaker to disambiguate.
  if (relevant.length === 1 && relevant[0].role === "user") return relevant[0].text;
  return relevant.map((message) => `${speakerLabel(message, agents)}: ${message.text}`).join("\n\n");
}

function speakerLabel(message: ChatMessage, agents: Agent[]): string {
  if (message.role === "user") return "You";
  const author = agents.find((candidate) => candidate.id === message.agentId);
  return author?.name ?? "Another agent";
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index--) {
    if (predicate(items[index])) return index;
  }
  return -1;
}
