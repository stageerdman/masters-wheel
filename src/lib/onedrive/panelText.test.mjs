// Run with `npm test`. The storage sentences from SPEC §5 and §6.2.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  disconnectSheet,
  formatBytes,
  nameTitles,
  numbersLine,
  problemNotice,
  statusLine,
  switchSheet,
} from "./panelText.ts";

const GB = 1_000_000_000;
const still = { toCloud: 0, toCloudBytes: 0, toMac: 0, toMacBytes: 0, freeBytes: 80 * GB, enoughRoom: true, shortBytes: 0 };

function video(state, size = GB, recordId = "r1") {
  return { spaceId: "s1", recordId, fileName: "hero.mp4", state, percent: 0, size, keepUntil: null, lastError: null, retryAt: null };
}

function overview(changes = {}) {
  return {
    mode: "backup",
    connected: true,
    account: "maria@acme.com",
    disconnecting: false,
    online: true,
    signedIn: true,
    signInPending: false,
    revoked: false,
    cloudFull: false,
    uploadBytesLeft: 0,
    pending: still,
    videos: [],
    ...changes,
  };
}

const noTitles = () => undefined;

test("bytes read like Finder", () => {
  assert.equal(formatBytes(12.4 * GB), "12.4 GB");
  assert.equal(formatBytes(31 * GB), "31 GB");
  assert.equal(formatBytes(850_000_000), "850 MB");
  assert.equal(formatBytes(1), "1 MB");
  assert.equal(formatBytes(0), "0 MB");
});

// Broke before: an empty (not yet scanned) overview read "1 MB" for both.
test("totals are honest when nothing is known yet", () => {
  assert.equal(numbersLine(overview()), "On this Mac: 0 MB · In OneDrive: 0 MB");
});

test("numbers line shows movement first, then totals", () => {
  const uploading = overview({ videos: [video("uploading"), video("waiting")], uploadBytesLeft: 1.5 * GB });
  assert.equal(numbersLine(uploading), "Uploading 2 videos · 1.5 GB left");

  const disconnecting = overview({ disconnecting: true, pending: { ...still, toMac: 3, toMacBytes: 31 * GB } });
  assert.equal(numbersLine(disconnecting), "Disconnecting · downloading 3 videos · 31 GB left");

  const backup = overview({ videos: [video("safeOnMac", 2 * GB)] });
  assert.equal(numbersLine(backup), "On this Mac: 2 GB · In OneDrive: 2 GB");

  const smart = overview({ mode: "smart", videos: [video("safeOnMac", 2 * GB), video("inCloud", 3 * GB)] });
  assert.equal(numbersLine(smart), "On this Mac: 2 GB · In OneDrive: 5 GB · Freed 3 GB");
});

// Broke before: signed out (or waiting on a Keychain prompt) still read
// "Uploading 119 videos · 66.4 GB left", though nothing could move.
test("paused uploads are not called uploading", () => {
  const paused = overview({ signedIn: false, videos: [video("paused", 2 * GB)], uploadBytesLeft: 2 * GB });
  assert.equal(numbersLine(paused), "On this Mac: 2 GB · In OneDrive: 0 MB");
});

test("while the sign-in is being read, the panel says so and asks for Keychain access", () => {
  const pending = overview({ signedIn: false, signInPending: true, videos: [video("paused")] });
  assert.equal(statusLine(pending).lead, "Checking your OneDrive sign-in");
  assert.equal(problemNotice(pending, noTitles).lead, "Waiting for Keychain access.");
});

test("only the highest-priority problem shows, with its one fix", () => {
  const signedOut = overview({ signedIn: false, cloudFull: true, videos: [video("inCloud")] });
  assert.deepEqual(problemNotice(signedOut, noTitles), {
    lead: "Signed out of OneDrive.",
    rest: " Uploads are paused, and 1 video can't play until you sign in.",
    action: "signIn",
  });
  assert.equal(problemNotice(overview({ cloudFull: true }), noTitles).action, "manageStorage");
  assert.equal(problemNotice(overview({ revoked: true, signedIn: false }), noTitles).action, null);
  assert.equal(problemNotice(overview({ connected: false, signedIn: false }), noTitles), null);
});

test("unreadable videos are named and can be retried", () => {
  const o = overview({ videos: [video("notUploadedUnreadable")] });
  const notice = problemNotice(o, () => "Acme discovery call");
  assert.equal(notice.action, "retry");
  assert.equal(
    notice.lead + notice.rest,
    `1 video couldn't be uploaded because its file couldn't be read: "Acme discovery call". It's still on this Mac.`,
  );
});

test("titles stop at three, then 'and N more'", () => {
  const list = ["a", "b", "c", "d", "e"].map((id) => video("missing", GB, id));
  assert.equal(nameTitles(list, (id) => id.toUpperCase()), `"A", "B", "C" and 2 more`);
  assert.equal(nameTitles(list.slice(0, 2), (id) => id), `"a" and "b"`);
  assert.equal(nameTitles(list, noTitles), "");
});

test("status line: signed out beats offline, offline is muted, all safe only when true", () => {
  assert.equal(statusLine(overview({ signedIn: false, online: false })).tone, "accent");
  assert.deepEqual(statusLine(overview({ online: false, videos: [video("inCloud")] })), {
    lead: "Offline",
    rest: " · 1 video needs internet to play",
    tone: "muted",
  });
  assert.equal(statusLine(overview({ videos: [video("safeOnMac"), video("inCloud")] })).rest, "All 2 videos safe in OneDrive");
  assert.equal(statusLine(overview()).rest, "OneDrive connected · new videos go there");
  assert.notEqual(statusLine(overview({ videos: [video("safeOnMac"), video("notUploadedUnreadable")] })).rest, "All 2 videos safe in OneDrive");
});

test("status line hides when not connected, unless videos are stranded in OneDrive", () => {
  assert.equal(statusLine(overview({ connected: false })), null);
  const stranded = overview({ connected: false, signedIn: false, videos: [video("inCloud"), video("safeOnMac")] });
  assert.equal(statusLine(stranded).rest, "1 video in OneDrive · connect to play them");
});

test("switching applies at once when nothing moves", () => {
  assert.equal(switchSheet("backup", "smart", still, true), null);
});

test("switch sheet blocks a download that doesn't fit", () => {
  const p = { ...still, toMac: 170, toMacBytes: 49 * GB, freeBytes: 30 * GB, enoughRoom: false, shortBytes: 20 * GB };
  const sheet = switchSheet("alwaysInCloud", "backup", p, false);
  assert.equal(sheet.canConfirm, false);
  assert.equal(sheet.body, "170 videos (49 GB) need to download back to this Mac, but you have 30 GB free. Free up 20 GB first.");
  assert.equal(sheet.offlineLine, "You're offline, so this starts when you're back.");
});

test("switch to Always in cloud warns that videos need internet", () => {
  const sheet = switchSheet("backup", "alwaysInCloud", { ...still, toCloud: 182, toCloudBytes: 53 * GB }, true);
  assert.equal(sheet.title, "Switch to Always in cloud?");
  assert.match(sheet.body, /^182 videos will move to OneDrive, freeing about 53 GB\. They'll need internet to play\./);
});

test("disconnect sheet: four variants", () => {
  assert.equal(disconnectSheet(overview(), still).confirmLabel, "Disconnect");

  const home = { ...still, toMac: 142, toMacBytes: 41 * GB };
  assert.equal(disconnectSheet(overview(), home).confirmLabel, "Download and disconnect");

  const tooBig = { ...home, freeBytes: 30 * GB, enoughRoom: false, shortBytes: 12 * GB };
  assert.equal(disconnectSheet(overview(), tooBig).canConfirm, false);

  const offline = disconnectSheet(overview({ online: false }), home);
  assert.equal(offline.confirmLabel, "Disconnect anyway");
  assert.equal(offline.confirmIsQuiet, true);
  assert.match(offline.body, /\(you're offline\)/);
});
