// Per-session "backed up to OneDrive" mark, read from the storage overview.

import type { StorageOverview, VideoState } from "./storage";

const SAFE_IN_ONEDRIVE: ReadonlySet<VideoState> = new Set(["safeOnMac", "inCloud"]);

// A session is backed up when it has videos and every one of them is safe in
// OneDrive. One video still uploading (or failed) means it isn't yet.
export function isBackedUp(overview: StorageOverview | null, spaceId: string, recordId: string): boolean {
  const videos = overview?.videos.filter((v) => v.spaceId === spaceId && v.recordId === recordId) ?? [];
  return videos.length > 0 && videos.every((v) => SAFE_IN_ONEDRIVE.has(v.state));
}
