export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  text: string;
  /** Which agent authored this reply — assistant messages only. Lets one
   * thread render each reply under its real author once 2+ agents can
   * reply in the same session (see dispatch.ts). */
  agentId?: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  activeAgentIds: string[];
  agentId?: string;
  /** One resumed Claude Code CLI session per agent that has ever replied
   * in this chat — never a single session shared across agents, so one
   * agent's replies are never fed back into another agent's own native
   * conversation history. See dispatch.ts's buildAgentTurnInput. */
  claudeSessionIds: Record<string, string>;
  /** Set only by makeNewSession in AIAssistant.script.ts — see
   * isDraftSession there. Never persisted (see storage.ts). */
  isDraft?: boolean;
};
