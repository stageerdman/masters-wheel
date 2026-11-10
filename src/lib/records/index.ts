// Local records backend — plain TS, no React. Every Performance Review
// record is a real folder on disk under the active Space's own `records/`
// folder (see src/lib/spaces) — each Space has a genuinely separate set of
// records; the folder name IS the record's id (see this update's
// wiki.md). All disk access goes through Tauri's fs plugin, scoped (see
// src-tauri/capabilities/space-data.json) to the Master's Wheel root.

import {
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { Scorecard, ScorecardItem } from "@/lib/scorecard";
import { BASE_DIR, spaceRecordsDir, STORAGE_DIR_NAME } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";

function recordsRoot() {
  return spaceRecordsDir(getActiveSpaceFolder());
}

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
  // Whether the user has personally reviewed/analyzed this call.
  reviewed: boolean;
  // How many times this record has been opened in Performance Review.
  openCount: number;
};

export type RecordSummary = RecordMetaFields & {
  id: string;
  heroFileName: string | null;
};

function recordDir(id: string) {
  return `${recordsRoot()}/${id}`;
}

function docPath(id: string, kind: DocKind) {
  return `${recordDir(id)}/${DOC_FILE_NAMES[kind]}`;
}

function metaPath(id: string) {
  return `${recordDir(id)}/meta.json`;
}

const TRANSCRIPT_FILE_NAME = "transcript.md";

function transcriptPath(id: string) {
  return `${recordDir(id)}/${TRANSCRIPT_FILE_NAME}`;
}

const SCORECARD_FILE_NAME = "scorecard.json";

function scorecardPath(id: string) {
  return `${recordDir(id)}/${SCORECARD_FILE_NAME}`;
}

// Same "missing or corrupt is just absent, not a crash" tolerance as
// parseMeta above.
function parseScorecard(text: string): Scorecard | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<Scorecard>;
  if (typeof candidate.generatedAt !== "string" || !Array.isArray(candidate.items)) return null;

  const items: ScorecardItem[] = [];
  for (const entry of candidate.items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<ScorecardItem>;
    if (
      typeof item.criterion !== "string" ||
      item.criterion === "" ||
      typeof item.rating !== "number" ||
      item.rating < 0 ||
      item.rating > 4 ||
      typeof item.reasoning !== "string"
    ) {
      continue;
    }
    items.push({
      criterion: item.criterion,
      rating: item.rating as ScorecardItem["rating"],
      reasoning: item.reasoning,
      timestampSeconds: typeof item.timestampSeconds === "number" ? item.timestampSeconds : null,
    });
  }
  if (items.length === 0) return null;

  return {
    generatedAt: candidate.generatedAt,
    items,
    improvementSuggestion: typeof candidate.improvementSuggestion === "string" ? candidate.improvementSuggestion : "",
  };
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
    reviewed: false,
    openCount: 0,
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
    reviewed: typeof candidate.reviewed === "boolean" ? candidate.reviewed : false,
    openCount: typeof candidate.openCount === "number" ? candidate.openCount : 0,
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

// Creates ~/Documents/Master's Wheel if it doesn't exist yet. Safe to
// call repeatedly — mkdir with recursive:true is a no-op if it's already
// there.
export async function ensureStorageRoot(): Promise<void> {
  await mkdir(recordsRoot(), { baseDir: BASE_DIR, recursive: true });
}

// One record per subfolder of the storage root. A folder with a missing
// or corrupt meta.json is skipped, not a crash — see wiki.md.
export async function listRecords(): Promise<RecordSummary[]> {
  await ensureStorageRoot();
  const entries = await readDir(recordsRoot(), { baseDir: BASE_DIR });
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

// Reads a record's transcript.md. Returns null if none has been imported
// yet — this module doesn't parse it, that's src/lib/transcript's job.
export async function readTranscript(id: string): Promise<string | null> {
  try {
    return await readTextFile(transcriptPath(id), { baseDir: BASE_DIR });
  } catch {
    return null;
  }
}

// Overwrites transcript.md with already-serialized text (canonical form
// after import, or after a speaker rename).
export async function writeTranscript(id: string, text: string): Promise<void> {
  await writeTextFile(transcriptPath(id), text, { baseDir: BASE_DIR });
}

// Reads a record's scorecard.json. Returns null if none has been
// generated yet (or the file is corrupt) — same lazy-and-tolerant pattern
// as readTranscript.
export async function readScorecard(id: string): Promise<Scorecard | null> {
  try {
    const text = await readTextFile(scorecardPath(id), { baseDir: BASE_DIR });
    return parseScorecard(text);
  } catch {
    return null;
  }
}

// Overwrites scorecard.json with a freshly generated scorecard.
export async function writeScorecard(id: string, scorecard: Scorecard): Promise<void> {
  await writeTextFile(scorecardPath(id), JSON.stringify(scorecard, null, 2), { baseDir: BASE_DIR });
}

// Copies an arbitrary transcript file in as transcript.md — same
// cross-filesystem copy pattern createRecordFromFile uses for hero files —
// then reads it back so the caller can parse/validate/normalize it.
export async function importTranscriptFile(id: string, sourcePath: string): Promise<string> {
  await copyFile(sourcePath, transcriptPath(id), { toPathBaseDir: BASE_DIR });
  return readTextFile(transcriptPath(id), { baseDir: BASE_DIR });
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
    reviewed: false,
    openCount: 0,
  };
  await writeTextFile(metaPath(id), JSON.stringify(meta, null, 2), { baseDir: BASE_DIR });

  return { id, heroFileName, ...meta };
}

// Deletes a record entirely — the whole folder, recursively. Irreversible;
// the caller is responsible for confirming with the user first.
export async function deleteRecord(id: string): Promise<void> {
  await remove(recordDir(id), { baseDir: BASE_DIR, recursive: true });
}

// Deletes just a record's hero media file, leaving the record (and its
// notes/transcript/meta) intact so a new video can be uploaded in its
// place.
export async function deleteHeroFile(id: string, heroFileName: string): Promise<void> {
  await remove(`${recordDir(id)}/${heroFileName}`, { baseDir: BASE_DIR });
}

// Copies a video file in as a record's hero file — same cross-filesystem
// copy createRecordFromFile uses, but for an existing record that
// currently has no hero file (after deleteHeroFile, or a record created
// without one).
export async function setHeroFile(id: string, sourcePath: string): Promise<string> {
  const ext = extensionOf(sourcePath);
  const heroFileName = ext ? `hero.${ext}` : "hero";
  await copyFile(sourcePath, `${recordDir(id)}/${heroFileName}`, { toPathBaseDir: BASE_DIR });
  return heroFileName;
}

// A record's hero file's real absolute path — needed by Generate
// Transcript, which shells out to ffprobe/ffmpeg (see
// src-tauri/src/transcribe.rs) and so needs a real filesystem path, unlike
// heroStreamUrl's HTTP URL onto the media server.
export async function heroAbsolutePath(id: string, heroFileName: string): Promise<string> {
  const docDir = await documentDir();
  return join(docDir, STORAGE_DIR_NAME, getActiveSpaceFolder(), "records", id, heroFileName);
}

// Reveals a record's folder in the OS file explorer (Finder on macOS),
// selected inside its parent. Needs the real absolute path — unlike the
// rest of this module, `revealItemInDir` doesn't go through Tauri's fs
// scope/BaseDirectory system.
export async function revealRecordInFinder(id: string): Promise<void> {
  const docDir = await documentDir();
  const absolutePath = await join(docDir, STORAGE_DIR_NAME, getActiveSpaceFolder(), "records", id);
  await revealItemInDir(absolutePath);
}

// Hero videos are served by a tiny local HTTP server (see
// src-tauri/src/media_server.rs) rather than Tauri's `asset://` protocol /
// `convertFileSrc`. That protocol buffers an entire file into memory for
// any request lacking a Range header, which made the longest recordings
// in this library (~1.5GB+) fail to load at all — a real HTTP server
// streams regardless of size. Must stay in sync with media_server.rs's
// PORT constant.
const MEDIA_SERVER_PORT = 47821;

export function heroStreamUrl(id: string, heroFileName: string): string {
  return `http://127.0.0.1:${MEDIA_SERVER_PORT}/${encodeURIComponent(id)}/${encodeURIComponent(heroFileName)}`;
}
