// Real on-disk storage for Training Room clips — plain TS, no React, same
// shape as src/lib/records. Each session's clips live under the active
// Space's own `training/<sessionId>/` folder.
//
// Why this exists: a clip picked via the native file dialog can be
// anywhere on disk, but Tauri's asset protocol (what `convertFileSrc`
// needs to actually serve a file to the webview) is scoped to
// `$DOCUMENT/Master's Wheel/**` (see src-tauri/tauri.conf.json) — an
// arbitrary picked path is almost never inside that scope, so playing it
// back directly silently fails (no error, the video element just never
// loads). Copying the file into real Space storage first, the same
// cross-filesystem copy pattern src/lib/records uses for hero files, puts
// it inside the allowed scope so convertFileSrc actually works. Playback
// stays on convertFileSrc rather than the records media server
// (src-tauri/src/media_server.rs) — that server exists specifically to
// stream multi-gigabyte call recordings; practice clips are expected to
// be far smaller, so convertFileSrc's whole-file-buffering tradeoff
// doesn't bite here the way it did for Performance Review.

import { copyFile, mkdir, remove } from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { BASE_DIR, spaceTrainingDir, STORAGE_DIR_NAME } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";

function sessionClipsDir(sessionId: string): string {
  return `${spaceTrainingDir(getActiveSpaceFolder())}/${sessionId}`;
}

export type StoredClip = { absolutePath: string; displayName: string };

// Copies `sourcePath` into this session's real storage folder and returns
// its new absolute path (for convertFileSrc) plus the original file's
// display name (kept separate since the on-disk copy is timestamp-
// prefixed to avoid collisions).
export async function storeClipFile(sessionId: string, sourcePath: string): Promise<StoredClip> {
  const dir = sessionClipsDir(sessionId);
  await mkdir(dir, { baseDir: BASE_DIR, recursive: true });

  const displayName = sourcePath.split(/[/\\]/).pop() ?? "clip";
  const storedName = `${Date.now()}-${displayName}`;
  await copyFile(sourcePath, `${dir}/${storedName}`, { toPathBaseDir: BASE_DIR });

  const docDir = await documentDir();
  const absolutePath = await join(
    docDir,
    STORAGE_DIR_NAME,
    getActiveSpaceFolder(),
    "training",
    sessionId,
    storedName
  );
  return { absolutePath, displayName };
}

// Deletes a session's whole clip storage folder — called when a session
// is removed, so its media doesn't outlive the session (same as
// Performance Review's "remove record" deleting the whole record folder).
export async function removeSessionStorage(sessionId: string): Promise<void> {
  await remove(sessionClipsDir(sessionId), { baseDir: BASE_DIR, recursive: true }).catch(() => {});
}
