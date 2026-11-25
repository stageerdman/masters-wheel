// Run with `npm test` (node's built-in runner; Node strips the .ts types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildManifest, cloudSegment, monthFolder, parseManifest, skeletonFolders } from "./layout.ts";

const work = { id: "s1", name: "Work: Sales", folderName: "Work- Sales" };
const home = { id: "s2", name: "Home", folderName: "Home" };

test("skeleton has a folder per Space per section", () => {
  assert.deepEqual(skeletonFolders([work, home]), [
    "Work- Sales/Performance Reviews",
    "Work- Sales/Voice Training",
    "Work- Sales/Frame Drills",
    "Home/Performance Reviews",
    "Home/Voice Training",
    "Home/Frame Drills",
  ]);
});

test("month folders are zero-padded local year-month", () => {
  assert.equal(monthFolder(home, "Frame Drills", new Date(2026, 0, 31, 23, 59)), "Home/Frame Drills/2026-01");
  assert.equal(monthFolder(home, "Voice Training", new Date(2026, 10, 1)), "Home/Voice Training/2026-11");
});

test("segments drop characters OneDrive rejects", () => {
  assert.equal(cloudSegment('a"b*c:d<e>f?g/h\\i|j'), "a-b-c-d-e-f-g-h-i-j");
  assert.equal(cloudSegment("  Trailing dots...  "), "Trailing dots");
  assert.equal(cloudSegment(" ... "), "Untitled");
});

test("manifest keeps createdAt and every Space ever seen, current names win", () => {
  const first = buildManifest(null, [work], "t0");
  assert.equal(first.createdAt, "t0");
  assert.deepEqual(first.spaces, [{ id: "s1", name: "Work: Sales", folder: "Work- Sales" }]);

  const renamed = { ...work, name: "Sales" };
  const second = buildManifest(first, [renamed, home], "t1");
  assert.equal(second.createdAt, "t0");
  assert.equal(second.updatedAt, "t1");
  assert.deepEqual(
    second.spaces.map((s) => s.name),
    ["Sales", "Home"]
  );

  // A Space deleted on this Mac stays listed: its cloud folder still exists.
  assert.equal(buildManifest(second, [home], "t2").spaces.length, 2);
});

test("manifest round-trips and tolerates junk", () => {
  const manifest = buildManifest(null, [home], "t0");
  assert.deepEqual(parseManifest(JSON.stringify(manifest)), manifest);
  assert.equal(parseManifest(null), null);
  assert.equal(parseManifest("<html>"), null);
  assert.deepEqual(parseManifest('{"spaces":[{"id":1},{"id":"a","name":"A","folder":"A"}]}').spaces, [
    { id: "a", name: "A", folder: "A" },
  ]);
});
