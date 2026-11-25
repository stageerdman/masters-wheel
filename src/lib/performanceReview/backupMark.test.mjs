// Run with `npm test`. The storage icon on each session row
// (docs/session-row-icons/03-ui-spec.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backupMark,
  backupStateFor,
  toBackupState,
} from "../../elements/PerformanceReview/PerformanceReview.backup.ts";

const video = (state, recordId = "r1", extra = {}) => ({
  spaceId: "s1",
  recordId,
  fileName: "call.mp4",
  state,
  percent: 0,
  size: 1,
  keepUntil: null,
  ...extra,
});

const on = (state, extra) => toBackupState({ connected: true, video: video(state, "r1", extra) });

test("toBackupState: inCloud is cloud only", () => {
  assert.equal(on("inCloud"), "cloud_only");
});

test("toBackupState: safeOnMac is cloud and this Mac", () => {
  assert.equal(on("safeOnMac"), "cloud_and_local");
});

test("toBackupState: not connected or no entry yet is this Mac only", () => {
  assert.equal(toBackupState({ connected: false, video: video("inCloud") }), "local_only");
  assert.equal(toBackupState({ connected: false, video: undefined }), "local_only");
  assert.equal(toBackupState({ connected: true, video: undefined }), "local_only");
});

test("toBackupState: moving, paused and unknown states are uploading", () => {
  for (const state of ["waiting", "uploading", "checking", "paused", "somethingNew"]) {
    assert.equal(on(state), "uploading", state);
  }
});

test("toBackupState: only safeOnMac and inCloud are safe", () => {
  const safe = ["waiting", "uploading", "checking", "paused", "notUploadedFull", "notUploadedUnreadable", "missing", "safeOnMac", "inCloud"]
    .filter((state) => ["cloud_only", "cloud_and_local"].includes(on(state)));
  assert.deepEqual(safe, ["safeOnMac", "inCloud"]);
});

test("toBackupState: full, unreadable and missing are stuck", () => {
  for (const state of ["notUploadedFull", "notUploadedUnreadable", "missing"]) {
    assert.equal(on(state), "stuck", state);
  }
});

test("toBackupState: a moving video with lastError stays uploading", () => {
  assert.equal(on("uploading", { lastError: "network", retryAt: 1 }), "uploading");
  assert.equal(on("waiting", { lastError: "network", retryAt: 1 }), "uploading");
});

test("backupStateFor finds the session's video in the overview", () => {
  const overview = { connected: true, videos: [video("uploading", "r1"), video("inCloud", "r2")] };
  assert.equal(backupStateFor(overview, "s1", "r2"), "cloud_only");
  assert.equal(backupStateFor(overview, "s1", "r1"), "uploading");
  assert.equal(backupStateFor(overview, "other", "r2"), "local_only");
  assert.equal(backupStateFor({ connected: false, videos: [] }, "s1", "r2"), "local_only");
});

test("backupStateFor: no overview yet is unknown, and draws nothing", () => {
  assert.equal(backupStateFor(null, "s1", "r2"), "unknown");
  assert.equal(backupMark("unknown"), null);
});

test("backupMark: one icon and one plain label per state", () => {
  assert.deepEqual(backupMark("cloud_only"), {
    visible: true,
    icon: "cloud",
    label: "In OneDrive only. Plays from the cloud",
  });
  assert.deepEqual(backupMark("cloud_and_local"), {
    visible: true,
    icon: "cloudDevice",
    label: "On OneDrive and this Mac",
  });
  assert.deepEqual(backupMark("local_only"), {
    visible: true,
    icon: "device",
    label: "Only on this Mac. Not uploaded yet",
  });
  assert.deepEqual(backupMark("uploading"), {
    visible: true,
    icon: "cloudUp",
    label: "Uploading to OneDrive…",
  });
  assert.deepEqual(backupMark("stuck"), {
    visible: true,
    icon: "cloudAlert",
    label: "Upload stuck. Open the cloud icon at the top to see why",
  });
});

test("backupMark: every state has its own icon", () => {
  const icons = ["cloud_only", "cloud_and_local", "local_only", "uploading", "stuck"].map(
    (state) => backupMark(state).icon
  );
  assert.equal(new Set(icons).size, icons.length);
});

