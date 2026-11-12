// Reads a user-picked text file from anywhere on disk. The fs read
// permission is scoped to the Master's Wheel storage root (see
// src-tauri/capabilities), and only copy-file reaches arbitrary user
// paths — so the file is copied into `scratchDir` (a BASE_DIR-relative
// folder inside that root, e.g. a record's or session's own folder) under
// a throwaway name, read, then removed. Copying to a temp name rather than
// straight onto the real destination means an unparseable file never
// clobbers whatever was already there.

import { copyFile, mkdir, readTextFile, remove } from "@tauri-apps/plugin-fs";
import { BASE_DIR } from "@/lib/spaces/paths";

export async function readExternalTextFile(sourcePath: string, scratchDir: string): Promise<string> {
  await mkdir(scratchDir, { baseDir: BASE_DIR, recursive: true });
  const tempPath = `${scratchDir}/.import-${Date.now()}.tmp`;
  await copyFile(sourcePath, tempPath, { toPathBaseDir: BASE_DIR });
  try {
    return await readTextFile(tempPath, { baseDir: BASE_DIR });
  } finally {
    await remove(tempPath, { baseDir: BASE_DIR }).catch(() => {});
  }
}
