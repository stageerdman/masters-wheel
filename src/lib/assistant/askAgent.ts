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

export async function askAgent(
  jobId: string,
  message: string,
  instructions: string,
  agentId: string,
  sessionId: string | undefined,
  chatSessionId: string,
): Promise<AgentReply> {
  return invoke<AgentReply>("ask_agent", {
    jobId,
    message,
    instructions,
    agentId,
    sessionId: sessionId ?? null,
    chatSessionId,
  });
}

export type AskAgentProgress = { jobId: string; delta: string };

// Subscribes to delta chunks for every in-flight reply (the Rust side emits
// one global event, same shape as onGenerateTranscriptProgress); the caller
// filters by `jobId`. Returns the unlisten function.
export async function onAskAgentProgress(callback: (progress: AskAgentProgress) => void): Promise<() => void> {
  return listen<AskAgentProgress>("ask-agent-progress", (event) => callback(event.payload));
}
