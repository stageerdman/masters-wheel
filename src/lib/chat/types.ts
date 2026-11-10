import type { ChatTag, SearchResultsPayload } from "@/lib/mcp/types";

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
  /** Set only for a search-results card — a snapshot of one
   * search_performance_reviews call's own result, appended the moment
   * it comes back mid-reply (see assistant.rs's "search-results" event
   * and AIAssistant.script.ts's dispatchAgentReply). Absent on every
   * ordinary message; nothing to respond to. */
  searchResults?: SearchResultsPayload;
};

/** How full one agent's resumed CLI session is, as of its latest reply —
 * see assistant.rs's extract_context_usage for where these numbers come
 * from. */
export type ContextUsage = { tokens: number; window: number };

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  agentId?: string;
  /** One resumed Claude Code CLI session per agent that has ever replied
   * in this chat — never a single session shared across agents, so one
   * agent's replies are never fed back into another agent's own native
   * conversation history. See dispatch.ts's buildAgentTurnInput. */
  claudeSessionIds: Record<string, string>;
  /** Per-agent context usage, keyed the same way as claudeSessionIds —
   * updated alongside it on every finalized reply. See
   * contextUsage.ts's summarizeContextUsage for turning this into one
   * number for the whole chat. */
  contextUsage: Record<string, ContextUsage>;
  /** Set only by makeNewSession in AIAssistant.script.ts — see
   * isDraftSession there. Never persisted (see storage.ts). */
  isDraft?: boolean;
  /** Which resources (Performance Review records, Training Room
   * sessions) are in scope for this chat right now — "suggested" follows
   * page navigation, "active" sticks once the AI has actually read that
   * resource. Purely a context/UI signal (see src/lib/mcp/types.ts) —
   * reading a resource's content is never gated. Scoped to this one
   * session only — switching chats starts with none. See
   * AIAssistant.script.ts's tag management. */
  tags: ChatTag[];
};
