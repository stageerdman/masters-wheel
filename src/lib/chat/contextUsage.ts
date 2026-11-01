import type { ChatSession, ContextUsage } from "./types";

// One chat can have several agents, each with its own independent
// resumed CLI session and its own context usage. The number worth
// surfacing for "this chat" is whichever agent is closest to filling its
// window — that's the one that would start losing context first, not an
// average across every agent that's replied.
export function summarizeContextUsage(session: ChatSession): ContextUsage | null {
  const entries = Object.values(session.contextUsage);
  if (entries.length === 0) return null;
  return entries.reduce((worst, entry) => (fillRatio(entry) > fillRatio(worst) ? entry : worst));
}

function fillRatio(usage: ContextUsage): number {
  return usage.window > 0 ? usage.tokens / usage.window : 0;
}
