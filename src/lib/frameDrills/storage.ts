// Frame Drills' on-disk side: the Space-wide templates file and each
// recorded take's audio file (inside the session's own training/<id>/
// folder, so deleting the session deletes its takes too).

import { exists, mkdir, readTextFile, remove, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceDir, spaceFrameTemplatesPath, spaceTrainingDir } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";
import { clipAbsolutePath } from "@/lib/training";
import { extensionForMime, parseTemplates, type FrameTemplate } from "./index";

export async function loadTemplates(): Promise<FrameTemplate[]> {
  const path = spaceFrameTemplatesPath(getActiveSpaceFolder());
  if (!(await exists(path, { baseDir: BASE_DIR }))) return [];
  return parseTemplates(await readTextFile(path, { baseDir: BASE_DIR }));
}

export async function saveTemplates(templates: FrameTemplate[]): Promise<void> {
  const folder = getActiveSpaceFolder();
  await mkdir(spaceDir(folder), { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(spaceFrameTemplatesPath(folder), JSON.stringify({ templates }, null, 2), { baseDir: BASE_DIR });
}

function sessionDir(sessionId: string): string {
  return `${spaceTrainingDir(getActiveSpaceFolder())}/${sessionId}`;
}

// Writes a recorded take into the session folder; returns its on-disk name
// and absolute path (for convertFileSrc).
export async function storeTake(
  sessionId: string,
  blob: Blob
): Promise<{ storedFileName: string; absolutePath: string }> {
  const dir = sessionDir(sessionId);
  await mkdir(dir, { baseDir: BASE_DIR, recursive: true });
  const storedFileName = `${Date.now()}-take.${extensionForMime(blob.type)}`;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(`${dir}/${storedFileName}`, bytes, { baseDir: BASE_DIR });
  return { storedFileName, absolutePath: await clipAbsolutePath(sessionId, storedFileName) };
}

// Best-effort — a take file that's already gone isn't an error.
export async function removeTake(sessionId: string, storedFileName: string): Promise<void> {
  const path = `${sessionDir(sessionId)}/${storedFileName}`;
  if (await exists(path, { baseDir: BASE_DIR })) await remove(path, { baseDir: BASE_DIR });
}
