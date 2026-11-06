// Agent persistence. An agent physically lives in exactly one Space's own
// folder (whichever Space it was created in — see src/lib/spaces), since
// the Rust knowledge pipeline writes knowledge.db/knowledge/ straight into
// that same per-agent directory and a file can't live in two places at
// once. But an agent is *visible* from any Space listed in its own
// `availableSpaceIds` (see types.ts) — "universal" by default, narrowed
// per-agent from the Agents page. So listAgents() scans every Space's
// agents/ folder, not just the active one, and every other operation here
// first has to find out which Space an agent's id actually lives under.
//
//   .../<home space>/agents/<id>/agent.json       (this file)
//   .../<home space>/agents/<id>/versions.json    (this file)
//   .../<home space>/agents/<id>/knowledge.db     (written by Rust)
//   .../<home space>/agents/<id>/knowledge/<file> (written by Rust)
//
// Only persistence lives here (read/write JSON to disk) — computing what
// a new version's change-label should say is a separate concern, see
// versionDiff.ts.

import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceAgentsDir } from "@/lib/spaces/paths";
import { getActiveSpace, getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";
import { listSpaces } from "@/lib/spaces/registry";
import type { Space } from "@/lib/spaces/types";
import type { Agent, AgentFields, AgentVersion } from "./types";

function agentsRootFor(spaceFolder: string) {
  return spaceAgentsDir(spaceFolder);
}

function agentDirFor(spaceFolder: string, id: string) {
  return `${agentsRootFor(spaceFolder)}/${id}`;
}

function agentJsonPathFor(spaceFolder: string, id: string) {
  return `${agentDirFor(spaceFolder, id)}/agent.json`;
}

function versionsJsonPathFor(spaceFolder: string, id: string) {
  return `${agentDirFor(spaceFolder, id)}/versions.json`;
}

export async function ensureAgentsRoot(): Promise<void> {
  await mkdir(agentsRootFor(getActiveSpaceFolder()), { baseDir: BASE_DIR, recursive: true });
}

// Scans every Space's agents/ folder for one with id — an agent only ever
// lives under one Space, so the first match found is it. Returns null for
// an id that hasn't been saved to disk yet (a brand-new, unsaved draft).
async function findAgentHomeSpace(id: string, spaces: Space[]): Promise<Space | null> {
  for (const space of spaces) {
    if (await exists(agentDirFor(space.folderName, id), { baseDir: BASE_DIR }).catch(() => false)) return space;
  }
  return null;
}

function parseAgent(id: string, text: string, homeSpace: Space, allSpaceIds: string[]): Agent | null {
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
  // Missing/corrupt availableSpaceIds (every agent saved before this field
  // existed) defaults to every Space that currently exists — agents are
  // universal unless explicitly narrowed down.
  const availableSpaceIds =
    Array.isArray(candidate.availableSpaceIds) && candidate.availableSpaceIds.every((value) => typeof value === "string")
      ? candidate.availableSpaceIds
      : allSpaceIds;
  return {
    id,
    homeSpaceId: homeSpace.id,
    homeSpaceFolder: homeSpace.folderName,
    name: candidate.name,
    nickname: typeof candidate.nickname === "string" ? candidate.nickname : "",
    nicknameLocked: typeof candidate.nicknameLocked === "boolean" ? candidate.nicknameLocked : false,
    description: typeof candidate.description === "string" ? candidate.description : "",
    instructions: typeof candidate.instructions === "string" ? candidate.instructions : "",
    photoUrl,
    knowledgeFiles: Array.isArray(candidate.knowledgeFiles) ? candidate.knowledgeFiles : [],
    availableSpaceIds,
  };
}

// One agent per subfolder of each Space's agents root. A folder with a
// missing or corrupt agent.json is skipped, not a crash — same convention
// listRecords() uses in src/lib/records/index.ts. Returns only the agents
// visible from the active Space (see parseAgent's availableSpaceIds
// default above).
export async function listAgents(): Promise<Agent[]> {
  const spaces = await listSpaces();
  const activeSpace = getActiveSpace();
  const allSpaceIds = spaces.map((space) => space.id);
  const agents: Agent[] = [];
  for (const space of spaces) {
    const root = agentsRootFor(space.folderName);
    await mkdir(root, { baseDir: BASE_DIR, recursive: true }).catch(() => {});
    let entries;
    try {
      entries = await readDir(root, { baseDir: BASE_DIR });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      try {
        const text = await readTextFile(agentJsonPathFor(space.folderName, entry.name), { baseDir: BASE_DIR });
        const agent = parseAgent(entry.name, text, space, allSpaceIds);
        if (agent) agents.push(agent);
      } catch {
        continue;
      }
    }
  }
  return agents.filter((agent) => agent.availableSpaceIds.includes(activeSpace.id));
}

export async function saveAgent(id: string, fields: AgentFields): Promise<void> {
  const spaces = await listSpaces();
  const homeFolder = (await findAgentHomeSpace(id, spaces))?.folderName ?? getActiveSpaceFolder();
  await mkdir(agentDirFor(homeFolder, id), { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(agentJsonPathFor(homeFolder, id), JSON.stringify(fields, null, 2), { baseDir: BASE_DIR });
}

// Deletes an agent entirely — its folder, knowledge database, and every
// stored knowledge file. Irreversible; the caller is responsible for
// confirming with the user first.
export async function deleteAgent(id: string): Promise<void> {
  const homeSpace = await findAgentHomeSpace(id, await listSpaces());
  if (!homeSpace) return;
  await remove(agentDirFor(homeSpace.folderName, id), { baseDir: BASE_DIR, recursive: true });
}

export async function listVersions(id: string): Promise<AgentVersion[]> {
  const homeSpace = await findAgentHomeSpace(id, await listSpaces());
  if (!homeSpace) return [];
  try {
    const text = await readTextFile(versionsJsonPathFor(homeSpace.folderName, id), { baseDir: BASE_DIR });
    const raw = JSON.parse(text);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function appendVersion(id: string, version: AgentVersion): Promise<void> {
  const spaces = await listSpaces();
  const homeFolder = (await findAgentHomeSpace(id, spaces))?.folderName ?? getActiveSpaceFolder();
  const current = await listVersions(id);
  await writeTextFile(versionsJsonPathFor(homeFolder, id), JSON.stringify([...current, version], null, 2), { baseDir: BASE_DIR });
}
