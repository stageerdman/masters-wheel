// The cloud icon's state, ring percent and time left, worked out from the
// storage engine's overview. Pure and free of path aliases so `npm test`
// imports it directly (src/lib/onedrive/cloudStatus.test.mjs).
// See docs/cloud-status-icon/03-ui-spec.md.

import type { StorageOverview, VideoState, VideoStatus } from "../../../../lib/onedrive/storage";

export type CloudState = "hidden" | "idle" | "uploading" | "problem";

const SAFE: readonly VideoState[] = ["safeOnMac", "inCloud"];
// Stuck until the user (or OneDrive) does something; left out of the ring.
const STUCK: readonly VideoState[] = ["notUploadedUnreadable", "notUploadedFull", "missing"];

function isMoving(v: VideoStatus): boolean {
  return !SAFE.includes(v.state) && !STUCK.includes(v.state);
}

export function cloudState(o: StorageOverview | null): CloudState {
  if (!o || !o.connected) return "hidden";
  const signedOut = !o.signedIn && !o.signInPending;
  if (signedOut || o.revoked || o.cloudFull || o.videos.some((v) => STUCK.includes(v.state))) return "problem";
  if (o.videos.some((v) => !SAFE.includes(v.state))) return "uploading";
  return "idle";
}

// Still on the way, but not moving right now (the engine retries by itself).
export function isPaused(o: StorageOverview): boolean {
  return (
    !o.online ||
    o.signInPending ||
    o.videos.some((v) => v.lastError !== null || v.state === "paused")
  );
}

// Share done (0–1) over the videos still on their way, weighted by size.
export function progress(o: StorageOverview): { fraction: number; count: number } {
  const moving = o.videos.filter(isMoving);
  const total = moving.reduce((sum, v) => sum + v.size, 0);
  if (total <= 0) return { fraction: 0, count: moving.length };
  const done = moving.reduce((sum, v) => sum + (v.size * (v.state === "checking" ? 100 : v.percent)) / 100, 0);
  return { fraction: Math.min(1, Math.max(0, done / total)), count: moving.length };
}

// Speed from how uploadBytesLeft falls over a rolling window.
export type Sample = { t: number; bytes: number };

export const WINDOW_MS = 20_000;
const MIN_SPAN_MS = 10_000;

// Keeps the last 20 s. Bytes going up (a new video joined) starts over.
export function addSample(samples: Sample[], next: Sample): Sample[] {
  const last = samples[samples.length - 1];
  if (last && next.bytes > last.bytes) return [next];
  return [...samples, next].filter((s) => next.t - s.t <= WINDOW_MS);
}

// null until there are 10 s of samples with bytes actually falling.
export function bytesPerSecond(samples: Sample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const span = last.t - first.t;
  const moved = first.bytes - last.bytes;
  if (span < MIN_SPAN_MS || moved <= 0) return null;
  return moved / (span / 1000);
}

// Rounded words, never a countdown: people only need "can I close the lid?".
export function etaWords(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes < 1) return "Less than a minute left";
  if (minutes > 60) return "More than an hour left";
  const rounded = minutes < 10 ? Math.round(minutes) : Math.round(minutes / 5) * 5;
  return rounded === 1 ? "About a minute left" : `About ${rounded} minutes left`;
}

export function timeLeft(samples: Sample[], bytesLeft: number): string | null {
  const speed = bytesPerSecond(samples);
  if (speed === null || bytesLeft <= 0) return null;
  return etaWords(bytesLeft / speed);
}

export function ariaLabel(state: CloudState, paused: boolean, percent: number): string {
  if (state === "idle") return "All videos safe in OneDrive";
  if (state === "problem") return "OneDrive needs you";
  if (state === "uploading") return paused ? `Uploads paused, ${percent}% done` : `Uploading, ${percent}% done`;
  return "";
}
