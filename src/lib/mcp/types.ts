// Shared types for the AI Assistant's MCP tool-calling layer. A "tag" is
// the visible, user-controlled unit of exposure: a Performance Review
// record the current chat session either currently has in view
// ("suggested" — follows wherever the user is navigating in Performance
// Review) or has actually been read by the AI at least once
// ("active" — sticks around regardless of page navigation, until removed).
// See PerformanceReview.script.ts (where "suggested" comes from) and
// AIAssistant.script.ts (where tags live per ChatSession).

export type PerformanceReviewTagKind = "suggested" | "active";

export type PerformanceReviewTag = {
  recordId: string;
  kind: PerformanceReviewTagKind;
};

// A comma-joined label like "notes, transcript" — get_performance_review
// (src-tauri/src/mcp/server.rs) builds this from whichever document
// types were actually requested, so it's free text, not a fixed union.
export type PermissionDocument = string;

export type PermissionDecision = "decline" | "allow" | "always-allow";

export type PermissionRequestStatus = "pending" | "allowed" | "declined" | "always-allowed" | "timed-out";

// Carried on a ChatMessage (see chat/types.ts) once the AI asks to read a
// record that isn't already covered by a tag — rendered as the
// PermissionRequest card while "pending", then collapsed to one line.
export type PermissionRequestPayload = {
  requestId: string;
  agentId: string;
  recordId: string;
  recordTitle: string;
  document: PermissionDocument;
  status: PermissionRequestStatus;
};
