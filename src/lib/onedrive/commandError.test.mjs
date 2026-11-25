// Run with `npm test`. Command errors arrive as { kind, message }.
import assert from "node:assert/strict";
import { test } from "node:test";
import { errorKind, errorMessage } from "./commandError.ts";

test("reads the kind and message the Rust side sends", () => {
  const error = { kind: "orgBlocked", message: "AADSTS65001" };
  assert.equal(errorKind(error), "orgBlocked");
  assert.equal(errorMessage(error), "AADSTS65001");
});

test("anything unexpected is 'other' and still has a message", () => {
  assert.equal(errorKind("boom"), "other");
  assert.equal(errorKind({ kind: "weird" }), "other");
  assert.equal(errorMessage("boom"), "boom");
  assert.equal(errorMessage(null), "null");
});
