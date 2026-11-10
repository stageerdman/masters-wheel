// Frontend wrapper for the Rust side (src-tauri/src/assistant.rs), same
// shape as src/lib/transcript/generate.ts wrapping the transcribe commands —
// including the jobId + progress-event pattern, since a reply now streams
// in token-by-token instead of arriving as one blob.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// contextTokens/contextWindow describe how full the agent's resumed CLI
// session is as of this reply (0/0 if the CLI's result event didn't carry
// usage data) — see assistant.rs's extract_context_usage for how they're
// derived from a --resume'd call's own usage report.
export type AgentReply = { text: string; sessionId: string; contextTokens: number; contextWindow: number };

// agentSpaceFolder and activeSpaceFolder are deliberately separate: an
// agent is now usable from any Space it's available in, but its own
// knowledge.db only ever lives under the Space it was actually created in
// (agent.homeSpaceFolder), while the Performance Review records its MCP
// tools can see have to be the *chat's* Space — the one the user is
// actually sitting in right now, not wherever the agent happens to live.
export async function askAgent(
  jobId: string,
  message: string,
  instructions: string,
  agentId: string,
  sessionId: string | undefined,
  chatSessionId: string,
  agentSpaceFolder: string,
  activeSpaceFolder: string,
  // Only ever passed by AITrainerPane — grants get_roleplay_transcript
  // for this one call (see roleplay.rs/mcp::config::TRAINING_ALLOWED_TOOLS).
  // Every ordinary chat passes undefined.
  trainingSessionId?: string,
): Promise<AgentReply> {
  return invoke<AgentReply>("ask_agent", {
    jobId,
    message,
    instructions,
    agentId,
    sessionId: sessionId ?? null,
    chatSessionId,
    agentSpaceFolder,
    activeSpaceFolder,
    trainingSessionId: trainingSessionId ?? null,
  });
}

export type AskAgentProgress = { jobId: string; delta: string };

// Subscribes to delta chunks for every in-flight reply (the Rust side emits
// one global event, same shape as onGenerateTranscriptProgress); the caller
// filters by `jobId`. Returns the unlisten function.
export async function onAskAgentProgress(callback: (progress: AskAgentProgress) => void): Promise<() => void> {
  return listen<AskAgentProgress>("ask-agent-progress", (event) => callback(event.payload));
}

// Fires once per search_performance_reviews call a reply makes, as soon
// as that tool's own result comes back — before the reply text has even
// finished streaming. `matches` is SearchResultMatch[] (see
// src/lib/mcp/types.ts) but typed loosely here, same reasoning as
// AskAgentProgress: this is a thin wrapper over the raw Tauri event, not
// the place to own that shape.
export type SearchResultsProgress = { jobId: string; query: string; matches: unknown };

export async function onSearchResultsProgress(
  callback: (progress: SearchResultsProgress) => void,
): Promise<() => void> {
  return listen<SearchResultsProgress>("search-results", (event) => callback(event.payload));
}
