// Shared types for the AI Assistant's MCP tool-calling layer. A "tag" is
// the visible, user-controlled unit of exposure: a resource (a
// Performance Review record, or — since this was generalized — a
// Training Room session) the current chat session either currently has
// in view ("suggested" — follows wherever the user is navigating) or has
// actually been read by the AI at least once ("active" — sticks around
// regardless of page navigation, until removed). See
// PerformanceReview.script.ts/TrainingRoom.script.ts (where "suggested"
// comes from, via src/lib/mcp/activeTaggedResource.ts) and
// AIAssistant.script.ts (where tags live per ChatSession).

export type TaggedResourceKind = "performanceReview" | "trainingSession";

export type TagState = "suggested" | "active";

export type ChatTag = {
  resourceKind: TaggedResourceKind;
  resourceId: string;
  state: TagState;
};

// A comma-joined label like "notes, transcript" — get_performance_review/
// get_training_session (src-tauri/src/mcp/server.rs) build this from
// whichever document types were actually requested, so it's free text,
// not a fixed union.
export type PermissionDocument = string;

export type PermissionDecision = "decline" | "allow" | "always-allow";

export type PermissionRequestStatus = "pending" | "allowed" | "declined" | "always-allowed" | "timed-out";

// Carried on a ChatMessage (see chat/types.ts) once the AI asks to read a
// resource that isn't already covered by a tag — rendered as the
// PermissionRequest card while "pending", then collapsed to one line.
export type PermissionRequestPayload = {
  requestId: string;
  agentId: string;
  resourceKind: TaggedResourceKind;
  resourceId: string;
  resourceTitle: string;
  document: PermissionDocument;
  status: PermissionRequestStatus;
};
