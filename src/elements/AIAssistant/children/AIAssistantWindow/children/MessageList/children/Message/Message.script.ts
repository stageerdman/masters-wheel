import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";

export type MessagePart = { text: string; mentionedAgent: Agent | null };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits message text around "@AgentName" occurrences so the mention can
// render as a styled tag instead of plain text — a separate, differently-
// shaped copy of AIAssistant.script.ts's findMentionedAgents, which
// returns a flat list rather than positioned segments.
export function splitMentions(text: string, agents: Agent[]): MessagePart[] {
  if (agents.length === 0) return [{ text, mentionedAgent: null }];

  const pattern = new RegExp(`@(${agents.map((agent) => escapeRegExp(agent.name)).join("|")})\\b`, "g");
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), mentionedAgent: null });
    }
    const agent = agents.find((candidate) => candidate.name === match![1]) ?? null;
    parts.push({ text: match[0], mentionedAgent: agent });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), mentionedAgent: null });
  }

  return parts;
}
