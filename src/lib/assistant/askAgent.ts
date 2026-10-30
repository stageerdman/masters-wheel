// Frontend wrapper for the Rust side (src-tauri/src/assistant.rs), same
// shape as src/lib/transcript/generate.ts wrapping the transcribe commands.

import { invoke } from "@tauri-apps/api/core";

export type AgentReply = { text: string; sessionId: string };

export async function askAgent(message: string, instructions: string, sessionId?: string): Promise<AgentReply> {
  return invoke<AgentReply>("ask_agent", { message, instructions, sessionId: sessionId ?? null });
}
