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
