// Run with `npm test`. The header logo + title: one click goes back to Main Menu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HOME_ROUTE, goHome, isHeaderHidden } from "../../elements/AppHeader/AppHeader.script.ts";

function fakeRouter() {
  const pushed = [];
  return { pushed, push: (href) => pushed.push(href) };
}

test("goHome pushes the home route exactly once", () => {
  const router = fakeRouter();
  goHome(router);
  assert.deepEqual(router.pushed, ["/"]);
});

test("home is the header-less Main Menu", () => {
  assert.equal(HOME_ROUTE, "/");
  assert.equal(isHeaderHidden(HOME_ROUTE), true);
});

test("every other page keeps the header and its home control", () => {
  for (const page of ["/performance-review", "/settings", "/agents", "/training", "/chat"]) {
    assert.equal(isHeaderHidden(page), false, page);
  }
});
