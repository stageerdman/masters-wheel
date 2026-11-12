// Run with `npm test` (node's built-in runner; Node strips the .ts types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { FORMAT_PARSERS } from "./formats.ts";

function parse(raw) {
  for (const p of FORMAT_PARSERS) {
    const parsed = p(raw);
    if (parsed) return parsed;
  }
  return null;
}

const fathom = `Weekly Sync - May 12
VIEW RECORDING - 45 mins (No highlights): https://fathom.video/share/abc123

---

0:00 - Jane Doe (Acme Inc)
  Okay, let's get started.
  Second line here.

0:12 - Bob Smith
  Sounds good - thanks.

1:02:03 - Jane Doe (Acme Inc)
  Wrapping up.
`;

test("Fathom: entries, timestamps, speakers without company parenthetical", () => {
  const parsed = parse(fathom);
  assert.deepEqual(parsed.entries, [
    { speaker: "Jane Doe", seconds: 0, text: "Okay, let's get started. Second line here." },
    { speaker: "Bob Smith", seconds: 12, text: "Sounds good - thanks." },
    { speaker: "Jane Doe", seconds: 3723, text: "Wrapping up." },
  ]);
});

test("Fathom: title and recording url become meta", () => {
  const meta = Object.fromEntries(parse(fathom).meta.map((f) => [f.key, f.value]));
  assert.equal(meta.source, "fathom");
  assert.equal(meta.title, "Weekly Sync - May 12");
  assert.equal(meta.recording_url, "https://fathom.video/share/abc123");
});

test("Fathom: a partial paste with no preamble still parses", () => {
  const parsed = parse("0:09 - A\n  hi\r\n0:15 - B\n  hello");
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[1].seconds, 15);
});

test("Canonical v1 still wins over Fathom", () => {
  const parsed = parse("---\ngenerated_at: x\n---\n\n**A** [00:05]\nhello\n");
  assert.deepEqual(parsed.entries, [{ speaker: "A", seconds: 5, text: "hello" }]);
  assert.equal(parsed.meta[0].key, "generated_at");
});

test("Unrecognized text gives null", () => {
  assert.equal(parse("just some notes\nwith no timestamps"), null);
});

const transcriberMulti = `---
source: /x/call.mp4
model: scribe_v1
speakers: 2
---

**Person 1** [00:00]
Hi there.

**Person 2** [01:00:05] (interrupting)
Sorry, go on.
`;

test("Transcriber multi-speaker: (interrupting) tag dropped, hh:mm:ss parsed", () => {
  const parsed = parse(transcriberMulti);
  assert.deepEqual(parsed.entries, [
    { speaker: "Person 1", seconds: 0, text: "Hi there." },
    { speaker: "Person 2", seconds: 3605, text: "Sorry, go on." },
  ]);
});

test("Transcriber single-speaker: plain paragraphs become untimed entries", () => {
  const parsed = parse("---\nsource: /x/a.m4a\nmodel: m\n---\n\nFirst paragraph\nstill first.\n\nSecond one.\n");
  assert.deepEqual(parsed.entries, [
    { speaker: "Speaker", seconds: null, text: "First paragraph\nstill first." },
    { speaker: "Speaker", seconds: null, text: "Second one." },
  ]);
});

test("Our own serialization of untimed entries (bare **Speaker** header) parses back", () => {
  const parsed = parse("---\nk: v\n---\n\n**Speaker**\nOne.\n\n**Speaker** [00:03]\nTwo.\n");
  assert.deepEqual(parsed.entries, [
    { speaker: "Speaker", seconds: null, text: "One." },
    { speaker: "Speaker", seconds: 3, text: "Two." },
  ]);
});

test("Bold text mid-paragraph is not a speaker header", () => {
  const parsed = parse("---\nk: v\n---\n\n**A** [00:01]\nSay **this** loudly.\n");
  assert.deepEqual(parsed.entries, [{ speaker: "A", seconds: 1, text: "Say **this** loudly." }]);
});
