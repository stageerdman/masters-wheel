// Shared types for the AI Assistant's MCP tool-calling layer. A "tag" is
// which resource (a Performance Review record, or — since this was
// generalized — a Training Room session) the current chat session
// either currently has in view ("suggested" — follows wherever the user
// is navigating) or has actually been read by the AI at least once
// ("active" — sticks around regardless of page navigation, until
// removed). Purely a context signal fed into the system prompt and
// shown as a chip — reading a resource's content is never gated. See
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

// One matched record from search_performance_reviews
// (src-tauri/src/mcp/tools/search_performance_reviews.rs) — field names
// match that Rust struct's serde output exactly, snake_case included,
// since this is parsed straight out of the tool's own JSON result, not
// through a Tauri command's camelCase conversion.
export type SearchResultMatch = {
  record_id: string;
  title: string;
  date: string;
  status: string | null;
  description: string;
  matched_in: string[];
  snippet?: string;
};

// Carried on a ChatMessage (see chat/types.ts) once the AI calls
// search_performance_reviews mid-reply — rendered as the SearchResults
// card. Nothing to respond to: it's a one-shot snapshot of that tool
// call's own result.
export type SearchResultsPayload = {
  query: string;
  matches: SearchResultMatch[];
};
