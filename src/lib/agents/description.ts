import type { Agent } from "./types";

const DEFAULT_DESCRIPTION = "No description yet.";

// Every place an agent's description is shown to someone chatting with it
// (roster, picker, history) — never a bare blank line for an agent whose
// creator hasn't written one yet. The Agents editor itself is unaffected:
// its empty-state there is a real input placeholder, not this fallback.
export function agentDescription(agent: Agent): string {
  const trimmed = agent.description.trim();
  return trimmed || DEFAULT_DESCRIPTION;
}
