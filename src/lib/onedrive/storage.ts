// Video storage from the webview's side: thin calls into the Rust storage
// engine (src-tauri/src/storage), which owns uploads, modes and the ledger.
// Videos are named by Space id + record id (folders can be renamed).

import { invoke } from "@tauri-apps/api/core";

export type StorageMode = "backup" | "smart" | "alwaysInCloud";

export type VideoState =
  | "waiting"
  | "uploading"
  | "checking"
  | "paused"
  | "safeOnMac"
  | "inCloud"
  | "notUploadedFull"
  | "notUploadedUnreadable"
  | "missing";

export type VideoStatus = {
  spaceId: string;
  recordId: string;
  fileName: string;
  state: VideoState;
  percent: number;
  size: number;
  // Smart only: when it leaves this Mac (Unix seconds).
  keepUntil: number | null;
};

export type StorageOverview = {
  mode: StorageMode;
  online: boolean;
  signedIn: boolean;
  revoked: boolean;
  cloudFull: boolean;
  uploadBytesLeft: number;
  videos: VideoStatus[];
};

export type SwitchPreview = {
  toCloud: number;
  toCloudBytes: number;
  toMac: number;
  toMacBytes: number;
  freeBytes: number;
  enoughRoom: boolean;
};

// Emitted after every storage job; re-read the overview when it fires.
export const STORAGE_CHANGED_EVENT = "storage://changed";

type VideoRef = { spaceId: string; recordId: string };

export function getStorageOverview(): Promise<StorageOverview> {
  return invoke<StorageOverview>("storage_overview");
}

export function previewStorageSwitch(mode: StorageMode): Promise<SwitchPreview> {
  return invoke<SwitchPreview>("storage_preview_switch", { mode });
}

export function setStorageMode(mode: StorageMode): Promise<void> {
  return invoke("storage_set_mode", { mode });
}

// Opening keeps the video on this Mac while it's shown (and fetches it back
// in Smart); closing lets the mode decide again.
export function videoOpened(video: VideoRef): Promise<void> {
  return invoke("storage_video_opened", video);
}

export function videoClosed(video: VideoRef): Promise<void> {
  return invoke("storage_video_closed", video);
}

// Call after the app deleted the video (or its whole record) from disk.
export function videoRemoved(video: VideoRef): Promise<void> {
  return invoke("storage_video_removed", video);
}

// Re-reads the account, rescans the Wheel folder and retries paused work.
export function wakeStorage(): Promise<void> {
  return invoke("storage_wake");
}

export function retryUnreadableVideos(): Promise<void> {
  return invoke("storage_retry_unreadable");
}
