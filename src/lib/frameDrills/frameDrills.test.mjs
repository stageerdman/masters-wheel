// Run with `npm test` (node's built-in runner; Node strips the .ts types).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  drillClockMs,
  extensionForMime,
  formatDrillClock,
  frameDrillsStateToMeta,
  parseFrameDrillsState,
  parseTemplates,
  upsertTemplate,
} from "./index.ts";

test("clock formats m:ss and goes into minus past zero", () => {
  assert.equal(formatDrillClock(0), "0:00");
  assert.equal(formatDrillClock(65_400), "1:05");
  assert.equal(formatDrillClock(-5_200), "-0:05");
  assert.equal(formatDrillClock(-125_000), "-2:05");
  // Under a second of overtime still reads as minus, not "0:00".
  assert.equal(formatDrillClock(-1), "-0:00");
});

test("timer counts down to negative; no timer counts up", () => {
  assert.equal(drillClockMs(10_000, 60), 50_000);
  assert.equal(drillClockMs(65_000, 60), -5_000);
  assert.equal(drillClockMs(10_000, null), 10_000);
});

test("upsertTemplate creates a new template on top", () => {
  const existing = [{ id: "a", text: "A", updatedAt: "t0" }];
  const next = upsertTemplate(existing, "B", null, "t1", "b");
  assert.deepEqual(next, [
    { id: "b", text: "B", updatedAt: "t1" },
    { id: "a", text: "A", updatedAt: "t0" },
  ]);
});

test("upsertTemplate rewrites an existing template in place and moves it to top", () => {
  const existing = [
    { id: "a", text: "A", updatedAt: "t0" },
    { id: "b", text: "B", updatedAt: "t0" },
  ];
  const next = upsertTemplate(existing, "B2", "b", "t1", "unused");
  assert.deepEqual(next, [
    { id: "b", text: "B2", updatedAt: "t1" },
    { id: "a", text: "A", updatedAt: "t0" },
  ]);
});

test("upsertTemplate with a vanished target id falls back to creating one", () => {
  const next = upsertTemplate([], "X", "gone", "t1", "x");
  assert.deepEqual(next, [{ id: "x", text: "X", updatedAt: "t1" }]);
});

test("drill state round-trips without persisting src, tolerates junk", () => {
  const state = {
    drills: [
      {
        id: "d1",
        text: "Frame",
        timerSeconds: 30,
        takes: [{ id: "t1", storedFileName: "1-take.m4a", src: "asset://x", recordedAt: "r", durationMs: 1200 }],
      },
    ],
  };
  const meta = JSON.parse(JSON.stringify(frameDrillsStateToMeta(state)));
  assert.equal(meta.drills[0].takes[0].src, undefined);
  const parsed = parseFrameDrillsState(meta);
  assert.equal(parsed.drills[0].takes[0].src, "");
  assert.equal(parsed.drills[0].timerSeconds, 30);

  assert.equal(parseFrameDrillsState(null), null);
  assert.deepEqual(parseFrameDrillsState({ drills: [42, { text: "no id" }] }), { drills: [] });
});

test("templates file parsing tolerates corrupt input", () => {
  assert.deepEqual(parseTemplates("not json"), []);
  assert.deepEqual(parseTemplates('{"templates":[{"id":"a","text":"A"},{"id":1}]}'), [
    { id: "a", text: "A", updatedAt: "" },
  ]);
});

test("recorded mime types map to playable extensions", () => {
  assert.equal(extensionForMime("audio/mp4"), "m4a");
  assert.equal(extensionForMime("audio/webm;codecs=opus"), "webm");
});
