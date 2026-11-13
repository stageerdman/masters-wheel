// Run with `npm test` (node's built-in runner; Node strips the .ts types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseClientCardReply } from "./generate.ts";
import { clientCardToText } from "./index.ts";

test("parses every labeled line, tolerating preamble and indentation", () => {
  const reply = `Here you go:
PROBLEM: Leads go cold after the first call.
  AVOIDING: Hiring another rep.
WHY_NOW: Q4 targets.
IF_NOT_RESOLVED: Misses quota, board review.
WHY_NOT_YET: No time to build a process.
OFFERED: 3-month coaching, $4,000.
NEXT_STEP: Call Friday 10:00.`;
  const fields = parseClientCardReply(reply);
  assert.equal(fields.problem, "Leads go cold after the first call.");
  assert.equal(fields.avoiding, "Hiring another rep.");
  assert.equal(fields.nextStep, "Call Friday 10:00.");
});

test("a missing label leaves that field empty; nothing at all returns null", () => {
  const fields = parseClientCardReply("PROBLEM: Only this.");
  assert.equal(fields.problem, "Only this.");
  assert.equal(fields.offered, "");
  assert.equal(parseClientCardReply("Sorry, I can't help."), null);
});

test("copied text has the title, every heading in order, and a dash for blanks", () => {
  const text = clientCardToText(
    {
      generatedAt: "2026-11-13T00:00:00Z",
      problem: "P",
      avoiding: "A",
      whyNow: "W",
      ifNotResolved: "I",
      whyNotYet: "Y",
      offered: "",
      nextStep: "N",
    },
    "Acme call"
  );
  assert.ok(text.startsWith("Client Card — Acme call\n\nTheir problem\nP"));
  assert.ok(text.includes("What was offered\n—"));
  assert.ok(text.endsWith("Next agreed step\nN"));
});
