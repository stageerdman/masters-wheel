// Run with `npm test`. The header logo + title: one click goes back to Main Menu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HOME_ROUTE, goHome, isHeaderHidden } from "../../elements/AppHeader/AppHeader.script.ts";

function fakeNavigator() {
  const visited = [];
  const navigate = (href) => visited.push(href);
  return { visited, navigate };
}

test("goHome hands the home route to the navigator exactly once", () => {
  const { visited, navigate } = fakeNavigator();
  goHome(navigate);
  assert.deepEqual(visited, ["/"]);
});

// Regression: router.push("/") hung on /index.txt?_rsc in the packaged app,
// leaving the user stuck on Performance Review. Home must be a full page load.
test("by default goHome does a full page load, not a client-router push", () => {
  const assigned = [];
  globalThis.window = { location: { assign: (href) => assigned.push(href) } };
  try {
    goHome();
  } finally {
    delete globalThis.window;
  }
  assert.deepEqual(assigned, ["/"]);
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
