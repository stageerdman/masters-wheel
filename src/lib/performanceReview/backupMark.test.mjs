// Run with `npm test`. The quiet "backed up" mark on each session row
// (docs/performance-review-redesign/03-ui-spec.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backupMark,
  backupStateFor,
  toBackupState,
} from "../../elements/PerformanceReview/PerformanceReview.backup.ts";

const video = (state, recordId = "r1") => ({
  spaceId: "s1",
  recordId,
  fileName: "call.mp4",
  state,
  percent: 0,
  size: 1,
  keepUntil: null,
});

test("toBackupState: safe copies count as backed up", () => {
  assert.equal(toBackupState({ connected: true, video: video("safeOnMac") }), "backed_up");
  assert.equal(toBackupState({ connected: true, video: video("inCloud") }), "backed_up");
});

test("toBackupState: anything still moving or stuck is pending", () => {
  for (const state of ["waiting", "uploading", "checking", "paused", "notUploadedFull", "notUploadedUnreadable", "missing"]) {
    assert.equal(toBackupState({ connected: true, video: video(state) }), "pending", state);
  }
});

test("toBackupState: no OneDrive or no video means not connected", () => {
  assert.equal(toBackupState({ connected: false, video: video("inCloud") }), "not_connected");
  assert.equal(toBackupState({ connected: true, video: undefined }), "not_connected");
});

test("backupStateFor finds the session's video in the overview", () => {
  const overview = { connected: true, videos: [video("uploading", "r1"), video("inCloud", "r2")] };
  assert.equal(backupStateFor(overview, "s1", "r2"), "backed_up");
  assert.equal(backupStateFor(overview, "s1", "r1"), "pending");
  assert.equal(backupStateFor(overview, "other", "r2"), "not_connected");
  assert.equal(backupStateFor(null, "s1", "r2"), "not_connected");
});

test("backupMark: shows for backed up, hidden for pending, absent when not connected", () => {
  assert.deepEqual(backupMark("backed_up"), { visible: true, label: "Video backed up to OneDrive" });
  assert.deepEqual(backupMark("pending"), { visible: false, label: "Not backed up yet" });
  assert.equal(backupMark("not_connected"), null);
});
