// Opens or installs the .app that `npm run app:build` just produced.
// app:build pins CARGO_TARGET_DIR to <repo>/src-tauri/target (absolute:
// Cargo runs from src-tauri/), so the bundle is always this checkout's own
// build. The machine-wide shared Cargo target is written by every worktree,
// so whatever opened from there could be any branch's.
//
//   node scripts/app-bundle.mjs open     open this checkout's build
//   node scripts/app-bundle.mjs install  quit the running app, copy it to /Applications
//   node scripts/app-bundle.mjs launch   install, then open the installed copy
//
// Start (`run:` in .project) uses `launch` after building, so the studio's
// Start and the user's /Applications app are always the same, newest build.

import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const APP_NAME = "Master's Wheel.app";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = path.join(ROOT, "src-tauri/target/release/bundle/macos", APP_NAME);
const INSTALLED = path.join("/Applications", APP_NAME);
const RUNNING_BINARY = path.join(INSTALLED, "Contents/MacOS/app");
const BUNDLE_ID = "com.erdman.masterswheel";
const QUIT_TIMEOUT_MS = 15000;

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`app-bundle: \`${command} ${args.join(" ")}\` failed (status ${result.status})`);
  }
}

function isRunning() {
  return spawnSync("pgrep", ["-f", RUNNING_BINARY]).status === 0;
}

// `open` on an app that's already running only brings the old process to
// the front, so a fresh install would never load. Quit it first and wait.
function quitRunning() {
  if (!isRunning()) return;
  run("osascript", ["-e", `quit app id "${BUNDLE_ID}"`]);
  const deadline = Date.now() + QUIT_TIMEOUT_MS;
  while (isRunning()) {
    if (Date.now() > deadline) throw new Error(`app-bundle: ${APP_NAME} didn't quit within ${QUIT_TIMEOUT_MS / 1000}s`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  console.log(`app-bundle: quit the running ${APP_NAME}`);
}

function requireBundle() {
  if (!existsSync(BUNDLE)) throw new Error(`app-bundle: no build at ${BUNDLE}; run \`npm run app:build\` first`);
}

const actions = {
  open() {
    requireBundle();
    run("open", [BUNDLE]);
  },
  install() {
    requireBundle();
    quitRunning();
    rmSync(INSTALLED, { recursive: true, force: true });
    // ditto keeps the bundle's symlinks, extended attributes and signature.
    run("ditto", [BUNDLE, INSTALLED]);
    console.log(`app-bundle: installed ${BUNDLE} -> ${INSTALLED}`);
  },
  launch() {
    actions.install();
    run("open", [INSTALLED]);
  },
};

const action = actions[process.argv[2]];
if (!action) {
  console.error(`app-bundle: usage: node scripts/app-bundle.mjs <${Object.keys(actions).join("|")}>`);
  process.exit(2);
}
action();
