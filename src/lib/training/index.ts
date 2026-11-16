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

import { copyFile, mkdir, readDir, readTextFile, remove, size, writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { documentDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { BASE_DIR, spaceTrainingDir, STORAGE_DIR_NAME } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";
import type { DiarizedWord } from "@/lib/transcript/generate";
import { readExternalTextFile } from "@/lib/readExternalTextFile";

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
  // ElevenLabs' real per-word timestamps for transcriptRaw, kept alongside
  // the canonical display text rather than inside it — transcriptRaw's own
  // [mm:ss] line timestamps get rounded to whole seconds on serialize/parse
  // (see src/lib/transcript/index.ts), which is fine for a line heading but
  // too coarse for a word-by-word highlight. LyricsTranscript buckets these
  // real words into each displayed line by time window instead of faking
  // even spacing across the line. `null` until "Generate transcript" has
  // run, or for a clip transcribed before this field existed.
  wordTimings: DiarizedWord[] | null;
  // Which "Generate transcript" choice produced transcriptRaw — lets a
  // later Regenerate button repeat the same choice without asking again.
  // `null` until generated (or for a clip transcribed before this field
  // existed, where Regenerate just falls back to the plain, non-diarized
  // choice).
  diarize: boolean | null;
};

// Shared validator for the per-word timing array stored on both a Voice
// Training clip (StoredClipMeta above) and a Learning file
// (TrainingRoom.data.ts's LearningFile) — same shape, same generation call
// (TrainingRoom.script.ts's generateTranscript), so one parser covers both
// rather than duplicating the field-by-field checks.
export function parseWordTimings(raw: unknown): DiarizedWord[] | null {
  if (!Array.isArray(raw)) return null;
  const words: DiarizedWord[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as Partial<DiarizedWord>;
    if (
      typeof candidate.start !== "number" ||
      typeof candidate.end !== "number" ||
      typeof candidate.text !== "string" ||
      typeof candidate.leadSpace !== "boolean"
    ) {
      return null;
    }
    words.push({
      start: candidate.start,
      end: candidate.end,
      text: candidate.text,
      leadSpace: candidate.leadSpace,
      speakerId: typeof candidate.speakerId === "string" ? candidate.speakerId : null,
    });
  }
  return words;
}

export type SessionMetaFields = {
  toolType: string;
  name: string;
  status: string;
  lastUpdatedAt: string;
  notes: string;
  clips: StoredClipMeta[];
  // Chat Roleplay's own persisted state (setup thread, locked scenario,
  // rounds, final report) — this module doesn't know that shape, same as
  // it doesn't know TrainingToolType/SessionStatus/ClipKind (see this
  // file's header). `null` for every other discipline, and for a
  // not-yet-written Chat Roleplay session.
  roleplay: unknown;
  // Learning's own persisted state (files/blocks/pin/selection) — same
  // "this module doesn't know the shape" boundary as roleplay above.
  // `null` for every other discipline.
  learning: unknown;
  // Frame Drills' own persisted state (drills + their recorded takes) —
  // same boundary again, see src/lib/frameDrills. `null` for every other
  // discipline.
  frameDrills: unknown;
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
    roleplay: null,
    learning: null,
    frameDrills: null,
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
    wordTimings: parseWordTimings(candidate.wordTimings),
    diarize: typeof candidate.diarize === "boolean" ? candidate.diarize : null,
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
    roleplay: candidate.roleplay ?? null,
    learning: candidate.learning ?? null,
    frameDrills: candidate.frameDrills ?? null,
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

// Containers WKWebView's <video> element can't actually decode — chiefly
// WebM (VP8/VP9 + Opus), which loads fine as a file but renders as the
// native "can't play this" icon, since Safari/WebKit on macOS has never
// shipped those codecs the way Chrome/Firefox do. Re-encoded to H.264/AAC
// MP4 at import time instead (see src-tauri/src/transcode.rs) rather than
// trying to make the original format play.
const TRANSCODE_EXTENSIONS = new Set(["webm", "mkv", "avi", "flv", "wmv"]);

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

// Copies `sourcePath` into this session's real storage folder — or, for a
// format WKWebView can't play, transcodes it there instead — and returns
// its new absolute path (for convertFileSrc), the stored file's on-disk
// name (for persisting in StoredClipMeta.fileName, to rebuild the absolute
// path on a later load), and a display name (kept separate from the
// on-disk name since that's timestamp-prefixed to avoid collisions, and
// may have had its extension changed by a transcode).
export async function storeClipFile(sessionId: string, sourcePath: string): Promise<StoredClip> {
  const dir = sessionDir(sessionId);
  await mkdir(dir, { baseDir: BASE_DIR, recursive: true });

  const originalName = sourcePath.split(/[/\\]/).pop() ?? "clip";

  if (TRANSCODE_EXTENSIONS.has(extensionOf(originalName))) {
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const displayName = `${baseName}.mp4`;
    const fileName = `${Date.now()}-${displayName}`;
    const absolutePath = await clipAbsolutePath(sessionId, fileName);
    await invoke("transcode_to_mp4", { sourcePath, destPath: absolutePath });
    return { absolutePath, fileName, displayName };
  }

  const displayName = originalName;
  const fileName = `${Date.now()}-${displayName}`;
  await copyFile(sourcePath, `${dir}/${fileName}`, { toPathBaseDir: BASE_DIR });

  const absolutePath = await clipAbsolutePath(sessionId, fileName);
  return { absolutePath, fileName, displayName };
}

// Reads a user-picked transcript file's raw text (for Learning's "Upload
// transcript") — staged through this session's own folder, see
// readExternalTextFile.
export async function readTranscriptFile(sessionId: string, sourcePath: string): Promise<string> {
  return readExternalTextFile(sourcePath, sessionDir(sessionId));
}

// Rebuilds a stored clip's real absolute path from its session id + stored
// file name — needed both right after storeClipFile and when reloading a
// persisted session from disk.
export async function clipAbsolutePath(sessionId: string, fileName: string): Promise<string> {
  const docDir = await documentDir();
  return join(docDir, STORAGE_DIR_NAME, getActiveSpaceFolder(), "training", sessionId, fileName);
}

// Learning's own file-storage extensions: pdf/epub are never played back
// or transcoded, just copied byte-for-byte and stored for download — no
// overlap with TRANSCODE_EXTENSIONS/storeClipFile's video/audio handling.
const DOCUMENT_EXTENSIONS = new Set(["pdf", "epub"]);

export function isLearningDocumentExtension(extension: string): boolean {
  return DOCUMENT_EXTENSIONS.has(extension.toLowerCase());
}

export type StoredLearningFile = StoredClip & { extension: string; sizeBytes: number };

// Learning's upload entry point: a pdf/epub is just copied as-is (no
// transcode — it's never decoded by anything, only downloaded); anything
// else delegates straight to storeClipFile so video/audio get the exact
// same transcode-if-WKWebView-can't-play-it treatment Voice Training's
// clips already get, rather than a second, divergent copy of that logic.
export async function storeLearningFile(sessionId: string, sourcePath: string): Promise<StoredLearningFile> {
  const originalName = sourcePath.split(/[/\\]/).pop() ?? "file";
  const extension = extensionOf(originalName);

  if (isLearningDocumentExtension(extension)) {
    const dir = sessionDir(sessionId);
    await mkdir(dir, { baseDir: BASE_DIR, recursive: true });
    const displayName = originalName;
    const fileName = `${Date.now()}-${displayName}`;
    const relativePath = `${dir}/${fileName}`;
    await copyFile(sourcePath, relativePath, { toPathBaseDir: BASE_DIR });
    const absolutePath = await clipAbsolutePath(sessionId, fileName);
    const sizeBytes = await size(relativePath, { baseDir: BASE_DIR });
    return { absolutePath, fileName, displayName, extension, sizeBytes };
  }

  const stored = await storeClipFile(sessionId, sourcePath);
  const sizeBytes = await size(`${sessionDir(sessionId)}/${stored.fileName}`, { baseDir: BASE_DIR });
  return { ...stored, extension: extensionOf(stored.fileName), sizeBytes };
}

// A document file's "download" action — the only place in the app that
// copies a stored file back out to a user-chosen location (no existing
// precedent to reuse). `save()` returning null means the user cancelled
// the picker, not a failure.
export async function downloadLearningFile(
  sessionId: string,
  storedFileName: string,
  suggestedName: string
): Promise<boolean> {
  const destination = await save({ defaultPath: suggestedName });
  if (!destination) return false;
  const absolutePath = await clipAbsolutePath(sessionId, storedFileName);
  await copyFile(absolutePath, destination);
  return true;
}

// The AI Trainer pane's own chat storage root — a training session's
// folder, not the Space-wide chats/ dir every other `useAIAssistant()`
// instance reads from. Passed as src/lib/chat's `root` override (see its
// storage.ts) so a Trainer conversation started from inside one training
// session never shows up from another, or from the floating AI Assistant/
// ChatPage's own history.
export function trainerChatsDir(sessionId: string): string {
  return `${sessionDir(sessionId)}/trainerChats`;
}

// Mindset Shifting's own chat storage root — same isolation reasoning as
// trainerChatsDir above, but for a discipline whose entire main column
// *is* the chat rather than a pane stacked alongside Notes. One session
// folder only ever grows one real conversation here (MindsetShiftingChat
// never calls startNewChat), but it still goes through the same
// `useAIAssistant(storageRoot)` override as every other scoped chat so a
// Mindset Shifting conversation never shows up from another training
// session or the floating AI Assistant/ChatPage's own history.
export function mindsetShiftingChatsDir(sessionId: string): string {
  return `${sessionDir(sessionId)}/mindsetChats`;
}
