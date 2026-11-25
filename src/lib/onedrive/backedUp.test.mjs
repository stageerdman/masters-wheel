// Run with `npm test`. The per-session "backed up to OneDrive" mark.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isBackedUp } from "./backedUp.ts";

function video(state, recordId = "r1", spaceId = "s1") {
  return { spaceId, recordId, fileName: "v.mp4", state, percent: 0, size: 1, keepUntil: null, lastError: null, retryAt: null };
}

const overview = (videos) => ({ videos });

test("backed up only when every video of the session is safe in OneDrive", () => {
  assert.equal(isBackedUp(overview([video("safeOnMac"), video("inCloud")]), "s1", "r1"), true);
  assert.equal(isBackedUp(overview([video("safeOnMac"), video("uploading")]), "s1", "r1"), false);
  assert.equal(isBackedUp(overview([video("notUploadedFull")]), "s1", "r1"), false);
});

test("a session without videos, or an unknown overview, is not backed up", () => {
  assert.equal(isBackedUp(overview([]), "s1", "r1"), false);
  assert.equal(isBackedUp(null, "s1", "r1"), false);
});

test("other sessions and other Spaces don't count", () => {
  const o = overview([video("waiting", "r2"), video("waiting", "r1", "s2"), video("inCloud")]);
  assert.equal(isBackedUp(o, "s1", "r1"), true);
  assert.equal(isBackedUp(o, "s1", "r2"), false);
});
