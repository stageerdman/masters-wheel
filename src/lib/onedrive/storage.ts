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
  // After a failed try: why, and when it tries again (Unix seconds).
  lastError: string | null;
  retryAt: number | null;
};

export type StorageOverview = {
  mode: StorageMode;
  // Connected on purpose; with `signedIn` false that means signed out.
  connected: boolean;
  account: string | null;
  disconnecting: boolean;
  online: boolean;
  signedIn: boolean;
  // The sign-in hasn't been read yet (macOS may be asking for Keychain access).
  signInPending: boolean;
  revoked: boolean;
  cloudFull: boolean;
  uploadBytesLeft: number;
  // What the current mode (or a running disconnect) still has to move.
  pending: SwitchPreview;
  videos: VideoStatus[];
};

export type SwitchPreview = {
  toCloud: number;
  toCloudBytes: number;
  toMac: number;
  toMacBytes: number;
  freeBytes: number;
  enoughRoom: boolean;
  // When there isn't enough room: how much to free up first.
  shortBytes: number;
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

// What a disconnect would bring home: everything comes back, as in Backup.
export function previewDisconnect(): Promise<SwitchPreview> {
  return previewStorageSwitch("backup");
}

// downloadFirst: bring every video only in OneDrive home, then sign out
// (SPEC 5.7). false = disconnect now ("Disconnect" / "Disconnect anyway").
export function disconnectStorage(downloadFirst: boolean): Promise<void> {
  return invoke("storage_disconnect", { downloadFirst });
}

export function stopDisconnecting(): Promise<void> {
  return invoke("storage_stop_disconnect");
}
