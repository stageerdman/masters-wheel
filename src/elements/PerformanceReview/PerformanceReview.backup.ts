// The one place Performance Review reads the storage engine's per-video
// status (src/lib/onedrive/storage, backed by src-tauri/src/storage). Kept
// free of React and path aliases so `npm test` can import it directly; the
// rest of the element imports it through PerformanceReview.data.ts.
// See docs/performance-review-redesign/03-ui-spec.md.

import type { StorageOverview, VideoStatus } from "../../lib/onedrive/storage";

export type BackupState = "backed_up" | "pending" | "not_connected";

export type RawBackup = { connected: boolean; video: VideoStatus | undefined };

export function toBackupState(raw: RawBackup): BackupState {
  if (!raw.connected || !raw.video) return "not_connected";
  switch (raw.video.state) {
    case "safeOnMac":
    case "inCloud":
      return "backed_up";
    default:
      return "pending";
  }
}

export function backupStateFor(
  overview: StorageOverview | null,
  spaceId: string,
  recordId: string
): BackupState {
  if (!overview) return "not_connected";
  const video = overview.videos.find((item) => item.spaceId === spaceId && item.recordId === recordId);
  return toBackupState({ connected: overview.connected, video });
}

// What a session row draws for a backup state: null = no element at all;
// visible false = screen-reader text only.
export type BackupMark = { visible: boolean; label: string } | null;

export function backupMark(state: BackupState): BackupMark {
  if (state === "backed_up") return { visible: true, label: "Video backed up to OneDrive" };
  if (state === "pending") return { visible: false, label: "Not backed up yet" };
  return null;
}
