// Agent persistence — one real folder per agent, under the active Space's
// own folder (see src/lib/spaces) — not a fixed path, since each Space has
// a genuinely separate set of Agents. The Rust side (see
// src-tauri/src/knowledge/) writes knowledge.db and the knowledge/ folder
// straight into the same per-agent directory, so this is the one place on
// disk everything about one agent lives.
//
//   .../<space>/agents/<id>/agent.json       (this file)
//   .../<space>/agents/<id>/versions.json    (this file)
//   .../<space>/agents/<id>/knowledge.db     (written by Rust)
//   .../<space>/agents/<id>/knowledge/<file> (written by Rust)
//
// Only persistence lives here (read/write JSON to disk) — computing what
// a new version's change-label should say is a separate concern, see
// versionDiff.ts.

import { mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceAgentsDir } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";
import type { Agent, AgentFields, AgentVersion } from "./types";

function agentsRoot() {
  return spaceAgentsDir(getActiveSpaceFolder());
}

function agentDir(id: string) {
  return `${agentsRoot()}/${id}`;
}

function agentJsonPath(id: string) {
  return `${agentDir(id)}/agent.json`;
}

function versionsJsonPath(id: string) {
  return `${agentDir(id)}/versions.json`;
}

export async function ensureAgentsRoot(): Promise<void> {
  await mkdir(agentsRoot(), { baseDir: BASE_DIR, recursive: true });
}

function parseAgent(id: string, text: string): Agent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<AgentFields>;
  if (typeof candidate.name !== "string") return null;
  // A `blob:` photoUrl (from this app's pre-fix photo picker) only ever
  // worked for the webview session that created it — on any later load
  // it's a permanently dead reference, not a real photo. Treating it as
  // "no photo" here means a previously-saved agent heals itself back to
  // the "+" placeholder instead of staying a broken image forever; the
  // user re-uploading via the current (persistent) picker is what
  // actually restores a working photo.
  const photoUrl = typeof candidate.photoUrl === "string" && !candidate.photoUrl.startsWith("blob:") ? candidate.photoUrl : null;
  return {
    id,
    name: candidate.name,
    nickname: typeof candidate.nickname === "string" ? candidate.nickname : "",
    nicknameLocked: typeof candidate.nicknameLocked === "boolean" ? candidate.nicknameLocked : false,
    description: typeof candidate.description === "string" ? candidate.description : "",
    instructions: typeof candidate.instructions === "string" ? candidate.instructions : "",
    photoUrl,
    knowledgeFiles: Array.isArray(candidate.knowledgeFiles) ? candidate.knowledgeFiles : [],
  };
}

// One agent per subfolder of the agents root. A folder with a missing or
// corrupt agent.json is skipped, not a crash — same convention
// listRecords() uses in src/lib/records/index.ts.
export async function listAgents(): Promise<Agent[]> {
  await ensureAgentsRoot();
  const entries = await readDir(agentsRoot(), { baseDir: BASE_DIR });
  const agents: Agent[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    try {
      const text = await readTextFile(agentJsonPath(entry.name), { baseDir: BASE_DIR });
      const agent = parseAgent(entry.name, text);
      if (agent) agents.push(agent);
    } catch {
      continue;
    }
  }
  return agents;
}

export async function saveAgent(id: string, fields: AgentFields): Promise<void> {
  await mkdir(agentDir(id), { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(agentJsonPath(id), JSON.stringify(fields, null, 2), { baseDir: BASE_DIR });
}

// Deletes an agent entirely — its folder, knowledge database, and every
// stored knowledge file. Irreversible; the caller is responsible for
// confirming with the user first.
export async function deleteAgent(id: string): Promise<void> {
  await remove(agentDir(id), { baseDir: BASE_DIR, recursive: true });
}

export async function listVersions(id: string): Promise<AgentVersion[]> {
  try {
    const text = await readTextFile(versionsJsonPath(id), { baseDir: BASE_DIR });
    const raw = JSON.parse(text);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function appendVersion(id: string, version: AgentVersion): Promise<void> {
  const current = await listVersions(id);
  await writeTextFile(versionsJsonPath(id), JSON.stringify([...current, version], null, 2), { baseDir: BASE_DIR });
}
