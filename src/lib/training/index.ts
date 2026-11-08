// Local training-session backend — plain TS, no React, same shape as
// src/lib/records. Every Training Room session is a real folder on disk
// under the active Space's own `training/` folder (see src/lib/spaces) —
// the folder name IS the session's id, holding `session.json` (structured
// fields: tool type, name, status, last-updated, notes, clip metadata) plus
// the clip media files themselves. This module doesn't know about
// TrainingToolType/SessionStatus/ClipKind unions — like records' meta.json,
// those fields are stored as whatever string was last written and validated
// by the UI layer that owns them (TrainingRoom.script.ts).
//
// Clip playback goes through Tauri's asset protocol (`convertFileSrc`),
// which is scoped to `$DOCUMENT/Master's Wheel/**` (see
// src-tauri/tauri.conf.json) — an arbitrary picked path is almost never
// inside that scope, so a clip is copied into this session's real storage
// folder first, the same cross-filesystem copy pattern src/lib/records uses
// for hero files. Playback stays on convertFileSrc rather than the records
// media server (src-tauri/src/media_server.rs) — that server exists
// specifically to stream multi-gigabyte call recordings; practice clips are
// expected to be far smaller, so convertFileSrc's whole-file-buffering
// tradeoff doesn't bite here the way it did for Performance Review.

import { copyFile, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { BASE_DIR, spaceTrainingDir, STORAGE_DIR_NAME } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";

function trainingRoot(): string {
  return spaceTrainingDir(getActiveSpaceFolder());
}

function sessionDir(id: string): string {
  return `${trainingRoot()}/${id}`;
}

const META_FILE_NAME = "session.json";

function metaPath(id: string): string {
  return `${sessionDir(id)}/${META_FILE_NAME}`;
}

// A clip's stored metadata. `fileName` is the on-disk, timestamp-prefixed
// name inside this session's folder (for rebuilding the absolute path on
// load) — distinct from `displayName`, the original file's name as shown
// in the UI.
export type StoredClipMeta = {
  id: string;
  kind: string;
  fileName: string;
  displayName: string;
  transcriptRaw: string | null;
};

export type SessionMetaFields = {
  toolType: string;
  name: string;
  status: string;
  lastUpdatedAt: string;
  notes: string;
  clips: StoredClipMeta[];
};

export type SessionSummary = SessionMetaFields & { id: string };

function emptyMeta(toolType: string, name: string): SessionMetaFields {
  return {
    toolType,
    name,
    status: "open",
    lastUpdatedAt: new Date().toISOString(),
    notes: "",
    clips: [],
  };
}

function parseClip(raw: unknown): StoredClipMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StoredClipMeta>;
  if (typeof candidate.id !== "string" || typeof candidate.kind !== "string" || typeof candidate.fileName !== "string") {
    return null;
  }
  return {
    id: candidate.id,
    kind: candidate.kind,
    fileName: candidate.fileName,
    displayName: typeof candidate.displayName === "string" ? candidate.displayName : candidate.fileName,
    transcriptRaw: typeof candidate.transcriptRaw === "string" ? candidate.transcriptRaw : null,
  };
}

// Same "missing or corrupt is just absent, not a crash" tolerance as
// src/lib/records' parseMeta.
function parseMeta(text: string): SessionMetaFields | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SessionMetaFields>;
  if (typeof candidate.toolType !== "string" || typeof candidate.name !== "string") return null;
  const clips = Array.isArray(candidate.clips)
    ? candidate.clips.map(parseClip).filter((clip): clip is StoredClipMeta => clip !== null)
    : [];
  return {
    toolType: candidate.toolType,
    name: candidate.name,
    status: typeof candidate.status === "string" ? candidate.status : "open",
    lastUpdatedAt: typeof candidate.lastUpdatedAt === "string" ? candidate.lastUpdatedAt : new Date().toISOString(),
    notes: typeof candidate.notes === "string" ? candidate.notes : "",
    clips,
  };
}

// Creates the Space's training/ root if it doesn't exist yet. Safe to call
// repeatedly.
export async function ensureStorageRoot(): Promise<void> {
  await mkdir(trainingRoot(), { baseDir: BASE_DIR, recursive: true });
}

// One session per subfolder of the training root. A folder with a missing
// or corrupt session.json is skipped, not a crash — same tolerance as
// listRecords.
export async function listSessions(): Promise<SessionSummary[]> {
  await ensureStorageRoot();
  const entries = await readDir(trainingRoot(), { baseDir: BASE_DIR });
  const summaries: SessionSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    const id = entry.name;
    let meta: SessionMetaFields | null;
    try {
      const text = await readTextFile(metaPath(id), { baseDir: BASE_DIR });
      meta = parseMeta(text);
    } catch {
      meta = null;
    }
    if (!meta) continue;
    summaries.push({ id, ...meta });
  }
  return summaries;
}

// Creates a new session folder + session.json. The caller picks `id`
// (Training Room uses the same makeId() scheme it already used for
// in-memory ids) since, unlike records, a session's folder name never
// needs to encode its name — the name is free to change without touching
// the folder.
export async function createSession(id: string, toolType: string, name: string): Promise<SessionSummary> {
  await mkdir(sessionDir(id), { baseDir: BASE_DIR, recursive: true });
  const meta = emptyMeta(toolType, name);
  await writeTextFile(metaPath(id), JSON.stringify(meta, null, 2), { baseDir: BASE_DIR });
  return { id, ...meta };
}

// Merges partial fields into session.json and persists it — same
// merge-then-write shape as records' writeMeta.
export async function writeSessionMeta(id: string, partial: Partial<SessionMetaFields>): Promise<void> {
  let current: SessionMetaFields;
  try {
    const text = await readTextFile(metaPath(id), { baseDir: BASE_DIR });
    current = parseMeta(text) ?? emptyMeta(partial.toolType ?? "voicePracticing", partial.name ?? "Untitled");
  } catch {
    current = emptyMeta(partial.toolType ?? "voicePracticing", partial.name ?? "Untitled");
  }
  const next: SessionMetaFields = { ...current, ...partial };
  await writeTextFile(metaPath(id), JSON.stringify(next, null, 2), { baseDir: BASE_DIR });
}

// Deletes a session entirely — the whole folder (session.json + every clip
// file it owns), recursively. Irreversible; the caller is responsible for
// confirming with the user first.
export async function deleteSession(id: string): Promise<void> {
  await remove(sessionDir(id), { baseDir: BASE_DIR, recursive: true });
}

export type StoredClip = { absolutePath: string; fileName: string; displayName: string };

// Copies `sourcePath` into this session's real storage folder and returns
// its new absolute path (for convertFileSrc), the stored file's on-disk
// name (for persisting in StoredClipMeta.fileName, to rebuild the absolute
// path on a later load), and the original file's display name (kept
// separate since the on-disk copy is timestamp-prefixed to avoid
// collisions).
export async function storeClipFile(sessionId: string, sourcePath: string): Promise<StoredClip> {
  const dir = sessionDir(sessionId);
  await mkdir(dir, { baseDir: BASE_DIR, recursive: true });

  const displayName = sourcePath.split(/[/\\]/).pop() ?? "clip";
  const fileName = `${Date.now()}-${displayName}`;
  await copyFile(sourcePath, `${dir}/${fileName}`, { toPathBaseDir: BASE_DIR });

  const absolutePath = await clipAbsolutePath(sessionId, fileName);
  return { absolutePath, fileName, displayName };
}

// Rebuilds a stored clip's real absolute path from its session id + stored
// file name — needed both right after storeClipFile and when reloading a
// persisted session from disk.
export async function clipAbsolutePath(sessionId: string, fileName: string): Promise<string> {
  const docDir = await documentDir();
  return join(docDir, STORAGE_DIR_NAME, getActiveSpaceFolder(), "training", sessionId, fileName);
}
