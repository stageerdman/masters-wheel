// Frontend wrapper for src-tauri/src/mcp/bridge.rs's two Tauri commands
// and two events — same shape as src/lib/assistant/askAgent.ts.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PerformanceReviewTag, PermissionDecision, PermissionDocument } from "./types";

export async function syncMcpTags(
  sessionId: string,
  tags: PerformanceReviewTag[],
  alwaysAllowedRecordIds: string[],
): Promise<void> {
  await invoke("sync_mcp_tags", {
    sessionId,
    tags: tags.map((tag) => ({ recordId: tag.recordId, kind: tag.kind })),
    alwaysAllowed: alwaysAllowedRecordIds,
  });
}

export async function respondToMcpPermission(requestId: string, decision: PermissionDecision): Promise<void> {
  await invoke("respond_to_mcp_permission", { requestId, decision });
}

export type McpPermissionRequestEvent = {
  requestId: string;
  sessionId: string;
  agentId: string;
  recordId: string;
  recordTitle: string;
  document: PermissionDocument;
};

export async function onMcpPermissionRequest(
  callback: (event: McpPermissionRequestEvent) => void,
): Promise<() => void> {
  return listen<McpPermissionRequestEvent>("mcp-permission-request", (event) => callback(event.payload));
}

export type McpTagUsedEvent = { sessionId: string; recordId: string };

export async function onMcpTagUsed(callback: (event: McpTagUsedEvent) => void): Promise<() => void> {
  return listen<McpTagUsedEvent>("mcp-tag-used", (event) => callback(event.payload));
}
