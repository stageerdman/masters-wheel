// Local records backend — plain TS, no React. Every Performance Review
// record is a real folder on disk under ~/Documents/Master's Circle/; the
// folder name IS the record's id (see this update's wiki.md). All disk
// access goes through Tauri's fs plugin, scoped (see
// src-tauri/capabilities/records.json) to that one directory.

import {
  BaseDirectory,
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";

const STORAGE_DIR_NAME = "Master's Circle";
const BASE_DIR = BaseDirectory.Document;

export type DocKind = "notes" | "analysis";

const DOC_FILE_NAMES: Record<DocKind, string> = {
  notes: "user_notes.md",
  analysis: "ai_analysis.md",
};

// Structured fields persisted in meta.json. `state` is stored as whatever
// string was last written (or null) — this module doesn't know about the
// CallState union, that validation belongs to the UI layer that owns it.
export type RecordMetaFields = {
  title: string;
  date: string;
  closedDate: string | null;
  state: string | null;
  offeredAmount: number | null;
  offeredCurrency: string | null;
  description: string;
};

export type RecordSummary = RecordMetaFields & {
  id: string;
  heroFileName: string | null;
};

function recordDir(id: string) {
  return `${STORAGE_DIR_NAME}/${id}`;
}

function docPath(id: string, kind: DocKind) {
  return `${recordDir(id)}/${DOC_FILE_NAMES[kind]}`;
}

function metaPath(id: string) {
  return `${recordDir(id)}/meta.json`;
}

function emptyMeta(title: string): RecordMetaFields {
  return {
    title,
    date: "",
    closedDate: null,
    state: null,
    offeredAmount: null,
    offeredCurrency: null,
    description: "",
  };
}

function parseMeta(text: string): RecordMetaFields | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<RecordMetaFields>;
  if (typeof candidate.title !== "string" || typeof candidate.date !== "string") return null;
  return {
    title: candidate.title,
    date: candidate.date,
    closedDate: typeof candidate.closedDate === "string" ? candidate.closedDate : null,
    state: typeof candidate.state === "string" ? candidate.state : null,
    offeredAmount: typeof candidate.offeredAmount === "number" ? candidate.offeredAmount : null,
    offeredCurrency: typeof candidate.offeredCurrency === "string" ? candidate.offeredCurrency : null,
    description: typeof candidate.description === "string" ? candidate.description : "",
  };
}

async function findHeroFileName(id: string): Promise<string | null> {
  try {
    const entries = await readDir(recordDir(id), { baseDir: BASE_DIR });
    const hero = entries.find((entry) => entry.isFile && entry.name.toLowerCase().startsWith("hero."));
    return hero?.name ?? null;
  } catch {
    return null;
  }
}

// Creates ~/Documents/Master's Circle if it doesn't exist yet. Safe to
// call repeatedly — mkdir with recursive:true is a no-op if it's already
// there.
export async function ensureStorageRoot(): Promise<void> {
  await mkdir(STORAGE_DIR_NAME, { baseDir: BASE_DIR, recursive: true });
}

// One record per subfolder of the storage root. A folder with a missing
// or corrupt meta.json is skipped, not a crash — see wiki.md.
export async function listRecords(): Promise<RecordSummary[]> {
  await ensureStorageRoot();
  const entries = await readDir(STORAGE_DIR_NAME, { baseDir: BASE_DIR });
  const summaries: RecordSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    const id = entry.name;
    let meta: RecordMetaFields | null;
    try {
      const text = await readTextFile(metaPath(id), { baseDir: BASE_DIR });
      meta = parseMeta(text);
    } catch {
      meta = null;
    }
    if (!meta) continue;
    const heroFileName = await findHeroFileName(id);
    summaries.push({ id, heroFileName, ...meta });
  }
  return summaries;
}

// Reads a record's notes/AI-analysis doc. Returns "" if nothing has been
// written yet — lazy creation means no file exists until the first
// non-empty write.
export async function readDoc(id: string, kind: DocKind): Promise<string> {
  try {
    return await readTextFile(docPath(id, kind), { baseDir: BASE_DIR });
  } catch {
    return "";
  }
}

// Writes a record's notes/AI-analysis doc. Stays lazy: an empty draft
// that was never non-empty never touches disk at all.
export async function writeDoc(id: string, kind: DocKind, text: string): Promise<void> {
  if (text === "") {
    const alreadyExists = await exists(docPath(id, kind), { baseDir: BASE_DIR }).catch(() => false);
    if (!alreadyExists) return;
  }
  await writeTextFile(docPath(id, kind), text, { baseDir: BASE_DIR });
}

// Merges partial fields into meta.json and persists it.
export async function writeMeta(id: string, partial: Partial<RecordMetaFields>): Promise<void> {
  let current: RecordMetaFields;
  try {
    const text = await readTextFile(metaPath(id), { baseDir: BASE_DIR });
    current = parseMeta(text) ?? emptyMeta(id);
  } catch {
    current = emptyMeta(id);
  }
  const next: RecordMetaFields = { ...current, ...partial };
  await writeTextFile(metaPath(id), JSON.stringify(next, null, 2), { baseDir: BASE_DIR });
}

function basenameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function extensionOf(path: string): string {
  const base = basenameOf(path);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function titleFromFileName(path: string): string {
  const base = basenameOf(path).replace(/\.[^./\\]+$/, "");
  const spaced = base.replace(/[_-]+/g, " ").trim();
  return spaced || "Untitled";
}

function slugify(name: string): string {
  return name.replace(/[/:]/g, "-").trim();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function uniqueRecordId(baseId: string): Promise<string> {
  let candidate = baseId;
  let n = 2;
  while (await exists(recordDir(candidate), { baseDir: BASE_DIR }).catch(() => false)) {
    candidate = `${baseId} (${n})`;
    n += 1;
  }
  return candidate;
}

// Creates a new record from an arbitrary source file path (from the
// native file dialog or a window drag-drop). Slugifies "<date> <title>"
// into the folder name — the folder name IS the id — copies the source in
// as hero.<ext>, and seeds meta.json with state: null (unclassified until
// the user picks a real state from the header dropdown).
export async function createRecordFromFile(sourcePath: string): Promise<RecordSummary> {
  await ensureStorageRoot();

  const date = todayIso();
  const title = titleFromFileName(sourcePath);
  const baseId = slugify(`${date} ${title}`);
  const id = await uniqueRecordId(baseId);

  await mkdir(recordDir(id), { baseDir: BASE_DIR, recursive: true });

  const ext = extensionOf(sourcePath);
  const heroFileName = ext ? `hero.${ext}` : "hero";
  await copyFile(sourcePath, `${recordDir(id)}/${heroFileName}`, { toPathBaseDir: BASE_DIR });

  const meta: RecordMetaFields = {
    title,
    date,
    closedDate: null,
    state: null,
    offeredAmount: null,
    offeredCurrency: null,
    description: "",
  };
  await writeTextFile(metaPath(id), JSON.stringify(meta, null, 2), { baseDir: BASE_DIR });

  return { id, heroFileName, ...meta };
}

// Resolves a record's hero file to an absolute filesystem path, suitable
// for passing to Tauri's `convertFileSrc` for real video playback.
export async function resolveHeroPath(id: string, heroFileName: string): Promise<string> {
  const documentsPath = await documentDir();
  return join(documentsPath, STORAGE_DIR_NAME, id, heroFileName);
}
