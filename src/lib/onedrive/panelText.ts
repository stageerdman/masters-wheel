// Every storage sentence the UI shows, worked out from the engine's
// overview (docs/onedrive-storage/SPEC.md §5 and §6.2). Pure: no React, no
// Tauri, so each rule is tested on its own (panelText.test.mjs).

import type { StorageMode, StorageOverview, SwitchPreview, VideoState, VideoStatus } from "./storage";

// `lead` is shown bold; `rest` follows it.
export type Line = { lead: string; rest: string };
export type Tone = "accent" | "muted" | "text";
export type StatusLine = Line & { tone: Tone };
export type NoticeAction = "signIn" | "manageStorage" | "retry" | null;
export type Notice = Line & { action: NoticeAction };
export type Sheet = {
  title: string;
  body: string;
  confirmLabel: string;
  canConfirm: boolean;
  // The confirm is a plain text button after Cancel ("Disconnect anyway").
  confirmIsQuiet: boolean;
  offlineLine: string | null;
};

// Record id → title; undefined when the record isn't loaded (other Space).
export type TitleOf = (recordId: string) => string | undefined;

export const MODE_NAMES: Record<StorageMode, string> = {
  backup: "Backup",
  smart: "Smart",
  alwaysInCloud: "Always in cloud",
};

const GB = 1_000_000_000;
const MB = 1_000_000;

// Decimal units, like Finder: 12.4 GB, 31 GB, 850 MB.
export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${trimZero((bytes / GB).toFixed(1))} GB`;
  return `${Math.max(1, Math.round(bytes / MB))} MB`;
}

function trimZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

export function videos(count: number): string {
  return `${count} ${count === 1 ? "video" : "videos"}`;
}

const UPLOADING: readonly VideoState[] = ["waiting", "uploading", "checking", "paused"];
const SAFE: readonly VideoState[] = ["safeOnMac", "inCloud"];

function inState(o: StorageOverview, states: readonly VideoState[]): VideoStatus[] {
  return o.videos.filter((v) => states.includes(v.state));
}

function sizeOf(list: VideoStatus[]): number {
  return list.reduce((sum, v) => sum + v.size, 0);
}

// What the engine is moving right now, or null when it's still (5.4).
function movement(o: StorageOverview): string | null {
  const { pending } = o;
  if (o.disconnecting) {
    return `Disconnecting · downloading ${videos(pending.toMac)} · ${formatBytes(pending.toMacBytes)} left`;
  }
  const uploading = inState(o, UPLOADING).length;
  if (uploading > 0) return `Uploading ${videos(uploading)} · ${formatBytes(o.uploadBytesLeft)} left`;
  if (pending.toMac > 0) {
    return `Downloading ${videos(pending.toMac)} to this Mac · ${formatBytes(pending.toMacBytes)} left`;
  }
  if (pending.toCloud > 0) return `Moving ${videos(pending.toCloud)} to OneDrive`;
  return null;
}

// The numbers line (5.4): the movement while anything moves, else totals.
export function numbersLine(o: StorageOverview): string {
  const moving = movement(o);
  if (moving) return moving;
  const onMac = sizeOf(o.videos.filter((v) => v.state !== "inCloud" && v.state !== "missing"));
  const freed = sizeOf(inState(o, ["inCloud"]));
  const totals = `On this Mac: ${formatBytes(onMac)} · In OneDrive: ${formatBytes(sizeOf(inState(o, SAFE)))}`;
  return o.mode === "backup" || freed === 0 ? totals : `${totals} · Freed ${formatBytes(freed)}`;
}

// Up to three titles, then "and N more"; counts only when none are known.
export function nameTitles(list: VideoStatus[], titleOf: TitleOf): string {
  const titles = list.map((v) => titleOf(v.recordId)).filter((t): t is string => Boolean(t));
  if (titles.length === 0) return "";
  const shown = titles.slice(0, 3).map((t) => `"${t}"`);
  const more = list.length - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

// The problem notice (5.6): only the highest-priority problem, with its fix.
export function problemNotice(o: StorageOverview, titleOf: TitleOf): Notice | null {
  if (!o.connected) return null;
  if (o.revoked) {
    return {
      lead: "Your organization no longer allows Master's Wheel to use OneDrive.",
      rest: " Your videos on this Mac are fine.",
      action: null,
    };
  }
  if (!o.signedIn) {
    const stuck = inState(o, ["inCloud"]).length;
    const rest = stuck > 0
      ? ` Uploads are paused, and ${videos(stuck)} can't play until you sign in.`
      : " Uploads are paused until you sign in.";
    return { lead: "Signed out of OneDrive.", rest, action: "signIn" };
  }
  if (o.cloudFull) {
    return {
      lead: "OneDrive is full.",
      rest: " New videos stay on this Mac until there's space, so nothing is lost.",
      action: "manageStorage",
    };
  }
  return missingNotice(o, titleOf) ?? unreadableNotice(o, titleOf);
}

function named(list: VideoStatus[], titleOf: TitleOf, before: string): string {
  const titles = nameTitles(list, titleOf);
  return titles ? `${before}${titles}.` : "";
}

function missingNotice(o: StorageOverview, titleOf: TitleOf): Notice | null {
  const missing = inState(o, ["missing"]);
  if (missing.length === 0) return null;
  const one = missing.length === 1;
  const titles = named(missing, titleOf, " ");
  return {
    lead: `We can't find ${videos(missing.length)} in OneDrive${titles ? ":" : "."}`,
    rest: `${titles} ${one ? "It" : "They"} may have been deleted there. You can remove ${one ? "it from its record" : "them from their records"} if you no longer need ${one ? "it" : "them"}.`,
    action: null,
  };
}

function unreadableNotice(o: StorageOverview, titleOf: TitleOf): Notice | null {
  const unreadable = inState(o, ["notUploadedUnreadable"]);
  if (unreadable.length === 0) return null;
  const one = unreadable.length === 1;
  const reason = one ? "its file couldn't be read" : "their files couldn't be read";
  const titles = named(unreadable, titleOf, ": ");
  return {
    lead: `${videos(unreadable.length)} couldn't be uploaded`,
    rest: ` because ${reason}${titles || "."} ${one ? "It's" : "They're"} still on this Mac.`,
    action: "retry",
  };
}

// The status line under the video list (6.2), or null when it's hidden.
export function statusLine(o: StorageOverview): StatusLine | null {
  if (!o.connected) return strandedLine(o);
  if (o.revoked) return { lead: "OneDrive access removed", rest: " · uploads stopped", tone: "accent" };
  if (!o.signedIn) return { lead: "Signed out of OneDrive", rest: " · uploads paused", tone: "accent" };
  if (o.cloudFull) {
    const notUploaded = inState(o, ["notUploadedFull"]).length;
    return { lead: "OneDrive is full", rest: ` · ${videos(notUploaded)} not uploaded`, tone: "accent" };
  }
  if (!o.online) return offlineLine(o);
  const missing = inState(o, ["missing"]).length;
  if (missing > 0) return { lead: "", rest: `${videos(missing)} missing in OneDrive`, tone: "accent" };
  const unreadable = inState(o, ["notUploadedUnreadable"]).length;
  if (unreadable > 0) return { lead: "", rest: `${videos(unreadable)} not uploaded`, tone: "accent" };
  return movingLine(o) ?? restingLine(o);
}

function strandedLine(o: StorageOverview): StatusLine | null {
  const stranded = inState(o, ["inCloud"]).length;
  if (stranded === 0) return null;
  return { lead: "", rest: `${videos(stranded)} in OneDrive · connect to play them`, tone: "muted" };
}

function offlineLine(o: StorageOverview): StatusLine {
  const needInternet = inState(o, ["inCloud"]).length;
  const rest = needInternet > 0
    ? ` · ${videos(needInternet)} need${needInternet === 1 ? "s" : ""} internet to play`
    : " · uploads continue when you're back";
  return { lead: "Offline", rest, tone: "muted" };
}

function movingLine(o: StorageOverview): StatusLine | null {
  if (o.disconnecting) {
    return { lead: "", rest: `Disconnecting · ${formatBytes(o.pending.toMacBytes)} left to download`, tone: "muted" };
  }
  const uploading = inState(o, UPLOADING).length;
  if (uploading > 0) {
    return { lead: "", rest: `${uploading} uploading · ${formatBytes(o.uploadBytesLeft)} left`, tone: "text" };
  }
  const moving = movement(o);
  return moving ? { lead: "", rest: moving, tone: "muted" } : null;
}

function restingLine(o: StorageOverview): StatusLine {
  if (o.videos.length === 0) return { lead: "", rest: "OneDrive connected · new videos go there", tone: "muted" };
  const allSafe = o.videos.every((v) => SAFE.includes(v.state));
  if (allSafe) return { lead: "", rest: `All ${videos(o.videos.length)} safe in OneDrive`, tone: "muted" };
  return { lead: "", rest: "OneDrive connected", tone: "muted" };
}

// The switch confirm (5.5), or null when nothing moves and it applies at once.
export function switchSheet(from: StorageMode, to: StorageMode, p: SwitchPreview, online: boolean): Sheet | null {
  if (p.toMac === 0 && p.toCloud === 0) return null;
  const name = MODE_NAMES[to];
  return {
    title: `Switch to ${name}?`,
    body: p.toMac > 0 ? downloadBody(from, to, p) : uploadBody(to, p),
    confirmLabel: `Switch to ${name}`,
    canConfirm: p.toMac === 0 || p.enoughRoom,
    confirmIsQuiet: false,
    offlineLine: online ? null : "You're offline, so this starts when you're back.",
  };
}

function uploadBody(to: StorageMode, p: SwitchPreview): string {
  const freeing = `freeing about ${formatBytes(p.toCloudBytes)}`;
  const safety = "Each one leaves this Mac only after it's safe in OneDrive.";
  if (to === "alwaysInCloud") {
    return `${videos(p.toCloud)} will move to OneDrive, ${freeing}. They'll need internet to play. ${safety}`;
  }
  return `${p.toCloud} older ${p.toCloud === 1 ? "video" : "videos"} will move to OneDrive, ${freeing}. ${safety}`;
}

function downloadBody(from: StorageMode, to: StorageMode, p: SwitchPreview): string {
  const size = formatBytes(p.toMacBytes);
  if (!p.enoughRoom) return notEnoughRoom(p);
  if (to === "smart" && from === "alwaysInCloud") {
    return `${p.toMac} recent ${p.toMac === 1 ? "video" : "videos"} (${size}) will download back to this Mac. You can keep working.`;
  }
  return `${videos(p.toMac)} (${size}) will download back to this Mac. You have ${formatBytes(p.freeBytes)} free. This may take a while. You can keep working.`;
}

function notEnoughRoom(p: SwitchPreview): string {
  return `${videos(p.toMac)} (${formatBytes(p.toMacBytes)}) need to download back to this Mac, but you have ${formatBytes(p.freeBytes)} free. Free up ${formatBytes(p.shortBytes)} first.`;
}

// The disconnect confirm (5.7). `p` is the disconnect preview (everything
// comes home); `o` tells whether it can download right now.
export function disconnectSheet(o: StorageOverview, p: SwitchPreview): Sheet {
  const base = { title: "Disconnect OneDrive?", confirmIsQuiet: false, offlineLine: null };
  if (p.toMac === 0) {
    return {
      ...base,
      body: "All your videos are on this Mac and stay there. The copies in OneDrive › Apps › Master's Wheel stay in OneDrive. Master's Wheel stops uploading.",
      confirmLabel: "Disconnect",
      canConfirm: true,
    };
  }
  const blocked = cantDownloadReason(o);
  if (blocked) {
    return {
      ...base,
      body: `${videos(p.toMac)} ${p.toMac === 1 ? "is" : "are"} only in OneDrive and can't download right now (${blocked}). If you disconnect anyway, they stay in OneDrive and won't play here until you connect again.`,
      confirmLabel: "Disconnect anyway",
      canConfirm: true,
      confirmIsQuiet: true,
    };
  }
  const only = `${videos(p.toMac)} ${p.toMac === 1 ? "is" : "are"} only in OneDrive (${formatBytes(p.toMacBytes)})`;
  const body = p.enoughRoom
    ? `${only}. They'll download back to this Mac first, then OneDrive disconnects. You have ${formatBytes(p.freeBytes)} free.`
    : `${only}, but you have ${formatBytes(p.freeBytes)} free. Free up ${formatBytes(p.shortBytes)} first, or stay connected.`;
  return { ...base, body, confirmLabel: "Download and disconnect", canConfirm: p.enoughRoom };
}

function cantDownloadReason(o: StorageOverview): string | null {
  if (o.revoked) return "your organization removed access";
  if (!o.signedIn) return "you're signed out";
  if (!o.online) return "you're offline";
  return null;
}
