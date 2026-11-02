// Chat session persistence — one real file per past conversation, under
// the app's own data directory. Same precedent as src/lib/agents/storage.ts
// (on-disk JSON over a hosted DB), simpler shape: a chat session has no
// companion artifacts the way an agent has a knowledge database, so one
// flat `<id>.json` file is enough — no per-session folder.
//
//   <app data>/chats/<id>.json
//
// Draft ("pick someone") sessions are never written here at all — see
// AIAssistant.script.ts's isDraftSession — they aren't real conversations
// yet, so there's nothing worth persisting.

import { BaseDirectory, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import type { ChatSession } from "./types";

const CHATS_DIR = "chats";
const BASE_DIR = BaseDirectory.AppData;
const EXTENSION = ".json";

function sessionPath(id: string) {
  return `${CHATS_DIR}/${id}${EXTENSION}`;
}

export async function ensureChatsRoot(): Promise<void> {
  await mkdir(CHATS_DIR, { baseDir: BASE_DIR, recursive: true });
}

function parseSession(id: string, text: string): ChatSession | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ChatSession>;
  if (!Array.isArray(candidate.messages)) return null;
  const now = new Date().toISOString();
  return {
    id,
    title: typeof candidate.title === "string" ? candidate.title : "Chat",
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    messages: candidate.messages,
    agentId: typeof candidate.agentId === "string" ? candidate.agentId : undefined,
    claudeSessionIds:
      candidate.claudeSessionIds && typeof candidate.claudeSessionIds === "object"
        ? (candidate.claudeSessionIds as Record<string, string>)
        : {},
    contextUsage:
      candidate.contextUsage && typeof candidate.contextUsage === "object"
        ? (candidate.contextUsage as ChatSession["contextUsage"])
        : {},
    tags: Array.isArray(candidate.tags) ? (candidate.tags as ChatSession["tags"]) : [],
    alwaysAllowedRecordIds: Array.isArray(candidate.alwaysAllowedRecordIds)
      ? (candidate.alwaysAllowedRecordIds as string[])
      : [],
  };
}

// One real past conversation per file. A file with a missing or corrupt
// body is skipped, not a crash — same convention listAgents() uses.
export async function listSessions(): Promise<ChatSession[]> {
  await ensureChatsRoot();
  const entries = await readDir(CHATS_DIR, { baseDir: BASE_DIR });
  const sessions: ChatSession[] = [];
  for (const entry of entries) {
    if (entry.isDirectory || !entry.name.endsWith(EXTENSION)) continue;
    const id = entry.name.slice(0, -EXTENSION.length);
    try {
      const text = await readTextFile(sessionPath(id), { baseDir: BASE_DIR });
      const session = parseSession(id, text);
      if (session) sessions.push(session);
    } catch {
      continue;
    }
  }
  return sessions;
}

export async function saveSession(session: ChatSession): Promise<void> {
  await ensureChatsRoot();
  await writeTextFile(sessionPath(session.id), JSON.stringify(session, null, 2), { baseDir: BASE_DIR });
}

export async function deleteSessionFile(id: string): Promise<void> {
  try {
    await remove(sessionPath(id), { baseDir: BASE_DIR });
  } catch {
    // Never persisted (a draft, or a session that errored before its
    // first save) — nothing to delete.
  }
}
