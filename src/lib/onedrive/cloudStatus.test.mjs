// Run with `npm test`. The Performance Review cloud icon: state, ring and time left.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addSample,
  bytesPerSecond,
  cloudState,
  etaWords,
  isPaused,
  progress,
  timeLeft,
} from "../../elements/PerformanceReview/children/CloudStatus/CloudStatus.script.ts";

function video(state, extra = {}) {
  return { spaceId: "s1", recordId: "r1", fileName: "v.mp4", state, percent: 0, size: 100, keepUntil: null, lastError: null, retryAt: null, ...extra };
}

function overview(videos, extra = {}) {
  return {
    connected: true,
    signedIn: true,
    signInPending: false,
    revoked: false,
    cloudFull: false,
    online: true,
    uploadBytesLeft: 0,
    videos,
    ...extra,
  };
}

test("hidden without an overview or a connection", () => {
  assert.equal(cloudState(null), "hidden");
  assert.equal(cloudState(overview([], { connected: false })), "hidden");
});

test("idle when every video is safe in OneDrive", () => {
  assert.equal(cloudState(overview([])), "idle");
  assert.equal(cloudState(overview([video("safeOnMac"), video("inCloud")])), "idle");
});

test("uploading while any video is on its way, paused ones included", () => {
  for (const state of ["waiting", "uploading", "checking", "paused"]) {
    assert.equal(cloudState(overview([video("safeOnMac"), video(state)])), "uploading", state);
  }
});

test("problem when the user has to act", () => {
  assert.equal(cloudState(overview([], { signedIn: false })), "problem");
  assert.equal(cloudState(overview([], { revoked: true })), "problem");
  assert.equal(cloudState(overview([], { cloudFull: true })), "problem");
  for (const state of ["notUploadedUnreadable", "notUploadedFull", "missing"]) {
    assert.equal(cloudState(overview([video("uploading"), video(state)])), "problem", state);
  }
});

test("waiting for Keychain, offline, or a passing error is paused, not a problem", () => {
  const moving = [video("uploading")];
  assert.equal(cloudState(overview(moving, { signedIn: false, signInPending: true })), "uploading");
  assert.equal(isPaused(overview(moving, { signedIn: false, signInPending: true })), true);
  assert.equal(cloudState(overview(moving, { online: false })), "uploading");
  assert.equal(isPaused(overview(moving, { online: false })), true);
  assert.equal(isPaused(overview([video("waiting", { lastError: "Server busy" })])), true);
  assert.equal(isPaused(overview([video("paused")])), true);
  assert.equal(isPaused(overview(moving)), false);
});

test("ring percent is weighted by size over the videos still moving", () => {
  const o = overview([
    video("uploading", { size: 300, percent: 50 }),
    video("checking", { size: 100, percent: 0 }),
    video("safeOnMac", { size: 1000 }),
    video("notUploadedUnreadable", { size: 1000 }),
  ]);
  const { fraction, count } = progress(o);
  assert.equal(count, 2);
  assert.equal(fraction, (150 + 100) / 400);
  assert.deepEqual(progress(overview([video("inCloud")])), { fraction: 0, count: 0 });
});

test("speed needs 10 s of falling bytes inside a 20 s window", () => {
  let s = [];
  s = addSample(s, { t: 0, bytes: 1000 });
  s = addSample(s, { t: 5000, bytes: 900 });
  assert.equal(bytesPerSecond(s), null);
  s = addSample(s, { t: 10_000, bytes: 800 });
  assert.equal(bytesPerSecond(s), 20);
  s = addSample(s, { t: 25_000, bytes: 500 });
  assert.equal(s[0].t, 5000, "samples older than 20 s drop off");
  assert.equal(bytesPerSecond(s), 20);
  s = addSample(s, { t: 26_000, bytes: 5000 });
  assert.deepEqual(s, [{ t: 26_000, bytes: 5000 }], "bytes rising starts over");
  assert.equal(bytesPerSecond([{ t: 0, bytes: 10 }, { t: 15_000, bytes: 10 }]), null, "no movement, no speed");
});

test("time left is in rounded words", () => {
  assert.equal(etaWords(30), "Less than a minute left");
  assert.equal(etaWords(80), "About a minute left");
  assert.equal(etaWords(7 * 60 + 10), "About 7 minutes left");
  assert.equal(etaWords(23 * 60), "About 25 minutes left");
  assert.equal(etaWords(60 * 60), "About 60 minutes left");
  assert.equal(etaWords(61 * 60), "More than an hour left");
});

test("no time left without enough data", () => {
  assert.equal(timeLeft([{ t: 0, bytes: 100 }], 100), null);
  assert.equal(timeLeft([{ t: 0, bytes: 2000 }, { t: 10_000, bytes: 1000 }], 1000), "Less than a minute left");
});
