import type { ChatTag, PermissionRequestPayload, TaggedResourceKind } from "@/lib/mcp/types";

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
  /** Set only for a permission-request card (see src/lib/mcp/types.ts) —
   * MessageList renders PermissionRequest instead of Message for one of
   * these. Absent on every ordinary message. */
  permissionRequest?: PermissionRequestPayload;
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
   * resource. Scoped to this one session only, by explicit user choice —
   * switching chats starts with none. See src/lib/mcp/types.ts and
   * AIAssistant.script.ts's tag management. */
  tags: ChatTag[];
  /** Resources the user picked "Always Allow" for in this chat — never
   * rendered as their own chips (see TagBar), just silently skips the
   * permission prompt for that resource for the rest of this session. */
  alwaysAllowedResources: { resourceKind: TaggedResourceKind; resourceId: string }[];
};
