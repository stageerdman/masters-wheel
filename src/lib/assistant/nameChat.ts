// Frontend wrapper for the Rust side's `name_chat` (src-tauri/src/assistant.rs)
// — a cheap, one-shot, non-persona call used once per session to title it
// after its first message, same shape as askAgent.ts's wrapper but with no
// job/progress stream since the reply is a single short string.

import { invoke } from "@tauri-apps/api/core";

export async function nameChat(message: string): Promise<string> {
  return invoke<string>("name_chat", { message });
}
