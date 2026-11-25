// The one place Performance Review reads the storage engine's per-video
// status (src/lib/onedrive/storage, backed by src-tauri/src/storage). Kept
// free of React and path aliases so `npm test` can import it directly; the
// rest of the element imports it through PerformanceReview.data.ts.
// See docs/session-row-icons/03-ui-spec.md.

import type { StorageOverview, VideoStatus } from "../../lib/onedrive/storage";

// Where a session's video lives. `unknown` = the overview isn't read yet,
// so the row draws nothing rather than flash a guess.
export type BackupState =
  | "unknown"
  | "cloud_only"
  | "cloud_and_local"
  | "local_only"
  | "uploading"
  | "stuck";

export type RawBackup = { connected: boolean; video: VideoStatus | undefined };

// States that wait for the user. Must match `STUCK` in
// children/CloudStatus/CloudStatus.script.ts, so the row and the header
// popover never disagree about the same video. Written again here on
// purpose: elements don't import from each other.
const STUCK: ReadonlySet<string> = new Set(["notUploadedUnreadable", "notUploadedFull", "missing"]);

export function toBackupState(raw: RawBackup): BackupState {
  if (!raw.connected || !raw.video) return "local_only";
  const state: string = raw.video.state;
  if (state === "inCloud") return "cloud_only";
  if (state === "safeOnMac") return "cloud_and_local";
  if (STUCK.has(state)) return "stuck";
  // waiting, uploading, checking, paused, and anything new: on its way.
  // A lastError here is a retry the engine makes by itself, not stuck.
  return "uploading";
}

export function backupStateFor(
  overview: StorageOverview | null,
  spaceId: string,
  recordId: string
): BackupState {
  if (!overview) return "unknown";
  const video = overview.videos.find((item) => item.spaceId === spaceId && item.recordId === recordId);
  return toBackupState({ connected: overview.connected, video });
}

export type StorageIcon = "cloud" | "cloudDevice" | "device" | "cloudUp" | "cloudAlert";

// What a session row draws for a storage state: null = nothing at all.
// `label` is both the tooltip and the aria-label.
export type BackupMark = { visible: boolean; label: string; icon: StorageIcon } | null;

const MARKS: Record<Exclude<BackupState, "unknown">, { label: string; icon: StorageIcon }> = {
  cloud_only: { icon: "cloud", label: "In OneDrive only. Plays from the cloud" },
  cloud_and_local: { icon: "cloudDevice", label: "On OneDrive and this Mac" },
  local_only: { icon: "device", label: "Only on this Mac. Not uploaded yet" },
  uploading: { icon: "cloudUp", label: "Uploading to OneDrive…" },
  stuck: { icon: "cloudAlert", label: "Upload stuck. Open the cloud icon at the top to see why" },
};

export function backupMark(state: BackupState): BackupMark {
  if (state === "unknown") return null;
  return { visible: true, ...MARKS[state] };
}
