// Chat session persistence — one real file per past conversation, under
// the active Space's own folder (see src/lib/spaces) — each Space has a
// genuinely separate chat history. Same precedent as
// src/lib/agents/storage.ts (on-disk JSON over a hosted DB), simpler shape:
// a chat session has no companion artifacts the way an agent has a
// knowledge database, so one flat `<id>.json` file is enough — no
// per-session folder.
//
//   .../<space>/chats/<id>.json
//
// Every function here takes an optional `root` override, defaulting to
// the Space-wide chats/ dir above — the second real consumer of "a chat
// history scoped to something narrower than a whole Space" is Chat
// Roleplay's AI Trainer pane (src/lib/training's trainerChatsDir), which
// passes its own training/<sessionId>/trainerChats/ root instead.
//
// Draft ("pick someone") sessions are never written here at all — see
// AIAssistant.script.ts's isDraftSession — they aren't real conversations
// yet, so there's nothing worth persisting.

import { mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceChatsDir } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";
import type { ChatSession } from "./types";

const EXTENSION = ".json";

function chatsRoot(root?: string) {
  return root ?? spaceChatsDir(getActiveSpaceFolder());
}

function sessionPath(id: string, root?: string) {
  return `${chatsRoot(root)}/${id}${EXTENSION}`;
}

export async function ensureChatsRoot(root?: string): Promise<void> {
  await mkdir(chatsRoot(root), { baseDir: BASE_DIR, recursive: true });
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
export async function listSessions(root?: string): Promise<ChatSession[]> {
  await ensureChatsRoot(root);
  const entries = await readDir(chatsRoot(root), { baseDir: BASE_DIR });
  const sessions: ChatSession[] = [];
  for (const entry of entries) {
    if (entry.isDirectory || !entry.name.endsWith(EXTENSION)) continue;
    const id = entry.name.slice(0, -EXTENSION.length);
    try {
      const text = await readTextFile(sessionPath(id, root), { baseDir: BASE_DIR });
      const session = parseSession(id, text);
      if (session) sessions.push(session);
    } catch {
      continue;
    }
  }
  return sessions;
}

export async function saveSession(session: ChatSession, root?: string): Promise<void> {
  await ensureChatsRoot(root);
  await writeTextFile(sessionPath(session.id, root), JSON.stringify(session, null, 2), { baseDir: BASE_DIR });
}

export async function deleteSessionFile(id: string, root?: string): Promise<void> {
  try {
    await remove(sessionPath(id, root), { baseDir: BASE_DIR });
  } catch {
    // Never persisted (a draft, or a session that errored before its
    // first save) — nothing to delete.
  }
}
