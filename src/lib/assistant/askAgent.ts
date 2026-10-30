// Frontend wrapper for the Rust side (src-tauri/src/assistant.rs), same
// shape as src/lib/transcript/generate.ts wrapping the transcribe commands —
// including the jobId + progress-event pattern, since a reply now streams
// in token-by-token instead of arriving as one blob.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type AgentReply = { text: string; sessionId: string };

export async function askAgent(
  jobId: string,
  message: string,
  instructions: string,
  sessionId?: string,
): Promise<AgentReply> {
  return invoke<AgentReply>("ask_agent", { jobId, message, instructions, sessionId: sessionId ?? null });
}

export type AskAgentProgress = { jobId: string; delta: string };

// Subscribes to delta chunks for every in-flight reply (the Rust side emits
// one global event, same shape as onGenerateTranscriptProgress); the caller
// filters by `jobId`. Returns the unlisten function.
export async function onAskAgentProgress(callback: (progress: AskAgentProgress) => void): Promise<() => void> {
  return listen<AskAgentProgress>("ask-agent-progress", (event) => callback(event.payload));
}
