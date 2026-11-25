// OneDrive from the webview's side: thin calls into the Rust `onedrive`
// module (src-tauri/src/onedrive), which owns the sign-in and every token.
// This side only decides *what* goes where (layout.ts).

import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { listSpaces } from "@/lib/spaces";
import { errorMessage } from "./commandError";
import { MANIFEST_PATH, buildManifest, parseManifest, skeletonFolders } from "./layout";
import { wakeStorage } from "./storage";

export * from "./commandError";
export * from "./layout";
export * from "./storage";

export type OneDriveStatus = {
  // false when this build has no ONEDRIVE_CLIENT_ID (no app registration).
  configured: boolean;
  connected: boolean;
  account: string | null;
};

export function getOneDriveStatus(): Promise<OneDriveStatus> {
  return invoke<OneDriveStatus>("onedrive_status");
}

// The storage engine reads the account itself; this tells it to look now.
async function thenWakeStorage(status: Promise<OneDriveStatus>): Promise<OneDriveStatus> {
  const result = await status;
  await wakeStorage();
  return result;
}

// Opens the browser for Microsoft sign-in and resolves once it's done.
export function connectOneDrive(): Promise<OneDriveStatus> {
  return thenWakeStorage(invoke<OneDriveStatus>("onedrive_connect"));
}

export function cancelConnectOneDrive(): Promise<void> {
  return invoke("onedrive_cancel_connect");
}

// "Show in OneDrive": opens the app folder on OneDrive web.
export function showFolderInOneDrive(): Promise<void> {
  return invoke("onedrive_show_folder");
}

const MANAGE_STORAGE_URL = "https://onedrive.live.com/?v=managestorage";

export function openManageStorage(): Promise<void> {
  return openUrl(MANAGE_STORAGE_URL);
}

// Creates the Space/Section folders for every Space and refreshes
// manifest.json. Safe to run again: existing folders are left alone.
export async function ensureAppFolder(): Promise<void> {
  const spaces = await listSpaces();
  for (const path of skeletonFolders(spaces)) {
    await invoke("onedrive_ensure_folder", { path }).catch((error) => {
      throw new Error(`Couldn't create the OneDrive folder "${path}": ${errorMessage(error)}`);
    });
  }
  const previous = parseManifest(await invoke<string | null>("onedrive_read_text", { path: MANIFEST_PATH }));
  const manifest = buildManifest(previous, spaces, new Date().toISOString());
  await invoke("onedrive_write_text", { path: MANIFEST_PATH, text: JSON.stringify(manifest, null, 2) });
}
