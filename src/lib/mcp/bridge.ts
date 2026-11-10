// Frontend wrapper for src-tauri/src/mcp/bridge.rs's Tauri command and
// event — same shape as src/lib/assistant/askAgent.ts.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ChatTag, TaggedResourceKind } from "./types";

export async function syncMcpTags(sessionId: string, tags: ChatTag[]): Promise<void> {
  await invoke("sync_mcp_tags", {
    sessionId,
    tags: tags.map((tag) => ({ resourceKind: tag.resourceKind, resourceId: tag.resourceId, state: tag.state })),
  });
}

export type McpTagUsedEvent = { sessionId: string; resourceKind: TaggedResourceKind; resourceId: string };

export async function onMcpTagUsed(callback: (event: McpTagUsedEvent) => void): Promise<() => void> {
  return listen<McpTagUsedEvent>("mcp-tag-used", (event) => callback(event.payload));
}
