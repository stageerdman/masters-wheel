# ONEDRIVE — store uploaded videos in the user's OneDrive

**Date:** 2026-11-25
**Status:** OPEN

## Goal
Let the user keep their videos (call recordings, Voice Training clips, Frame
Drills takes) in their own OneDrive, with three storage modes:
- **Backup**: the video stays on this Mac and a copy goes to OneDrive.
- **Always in cloud**: the video is uploaded, then the local copy is removed.
  It downloads again when it's opened.
- **Smart**: recent videos stay local, older ones move to the cloud only.

Connecting OneDrive is optional. Without it the app works exactly as it does
today.

## Roadmap
Each phase ends with tests that lock in what it built.

1. **Sign-in and app folder** (this item)
   - [x] Optional Microsoft sign-in: OAuth 2.0 auth code + PKCE, a loopback
         redirect on the fixed `http://localhost:47821`, Microsoft Graph,
         least-privilege scopes (`Files.ReadWrite.AppFolder User.Read
         offline_access`).
   - [x] Refresh token kept in the macOS Keychain. The access token is
         held in memory only and never sent to the webview.
   - [x] Sign out deletes the Keychain item and drops the in-memory token.
   - [x] The app folder (`OneDrive/Apps/<app name>/`) gets a
         `<Space>/<Section>/<YYYY-MM>/` layout and a small `manifest.json`.
   - [x] Settings → Storage panel: Connect / Disconnect, account name,
         honest errors.
   - [x] Tests: Rust (PKCE, authorize URL, redirect parsing, token
         response parsing, Graph path encoding, curl config escaping); TS
         (folder layout, manifest build/parse).
2. **Upload engine** (built: `src-tauri/src/storage/`)
   - [x] Resumable Graph upload sessions streamed from disk in 10 MiB
         chunks (multi-GB recordings), in Rust, in a background worker.
         `storage://changed` fires after each step.
   - [x] Persistent ledger (`<app data>/onedrive/videos.json`, written
         atomically) survives restarts. A half-done session resumes from
         its next offset. Retries back off up to 15 minutes; offline
         retries every 30 s, a full OneDrive every 10 min.
   - [x] Per-video cloud state (item id, size, receipt) lives in the
         ledger, not in the record's meta.json.
   - [x] Tests: chunked upload, resume after restart, offline, full,
         signed out, a different account, unreadable file.
3. **Storage modes** (built)
   - [x] One mode for the whole app: Backup (default), Smart, Always in
         cloud.
   - [x] Backup: every video on this Mac is uploaded and kept.
   - [x] Always in cloud: the local copy is deleted only after a receipt
         *and* a fresh size check against OneDrive, and never while the
         video is open. A `Video is in OneDrive.webloc` placeholder stays
         in the record folder.
   - [x] Smart: a video stays on this Mac for 14 days after it was added or
         last opened. Opening a cloud video brings it back (if there's
         room: 10% and 5 GB free) and restarts its 14 days.
   - [x] Tests: the policy function per mode, the "never delete an
         unconfirmed copy" rule in every mode, and switches Backup →
         Always → Backup, Always → Smart, mid-upload switches.
4. **Play from the cloud** (built)
   - [x] A cloud-only video plays at once: the media server answers a 302
         to OneDrive's short-lived download URL (cached 30 min), so the
         player streams with Range requests.
   - [x] Smart downloads it home in the background (`.hero-download.part`,
         size-checked, then renamed) and offloads it again after 14 days.
   - [x] Records list a cloud-only video's hero name from the storage
         overview, so Performance Review shows and plays it. Opening a
         record pins its video; deleting a record or its video deletes
         the OneDrive copy too.
   - [ ] Generate Transcript on a cloud-only video (ffmpeg needs a local
         file). Not built yet.
5. **UI and verification**
   - [ ] A cloud status badge per video (local / uploading / in cloud /
         both) and a mode picker in Settings → Storage.
   - [ ] Clear errors for an expired sign-in, a full OneDrive, or no
         network.
   - [ ] Tests for the status derivation. The user checks the live flow.

## Phase 1 status
Built. See "How to set up" below. Not verified live: a real sign-in needs
`ONEDRIVE_CLIENT_ID` (an Azure app registration) and a browser login by the
user.

## Phases 2–4 status
Built and covered by 40 Rust storage tests (fake OneDrive + temp folders).
The engine only runs once someone is signed in, so a user who never
connects sees no change. Not verified live: no real Microsoft account has
signed in yet (needs `ONEDRIVE_CLIENT_ID`). There is no UI for the mode
yet; the commands exist (`storage_set_mode`, `storage_preview_switch`,
`storage_overview`) for phase 5. Also still open: disconnect with
download-back (SPEC 5.7) and the "Playing from OneDrive" label.

## Phase 5 status
Built: Settings › Storage (connect, account block, one problem notice,
Keep videos radiogroup, numbers line, switch and disconnect sheets incl.
download-and-disconnect) and the video-list status line that opens
Settings › Storage. All sentences live in `src/lib/onedrive/panelText.ts`
(tested). Not verified live (still no `ONEDRIVE_CLIENT_ID`). Not built yet:
per-row glyphs (SPEC 6.1), player lines (6.4), remove-confirm copy (6.3),
the "wrong account" notice, and the "Moving N · M left" total (the
engine doesn't keep the switch's starting count, so only "left" shows).

### How to set up (one time)
1. Register an app at https://entra.microsoft.com → App registrations → New
   registration. Name it "Master's Wheel" (OneDrive uses this name for the
   app folder). Supported accounts: "Accounts in any organizational
   directory and personal Microsoft accounts".
2. Authentication → Add a platform → **Mobile and desktop applications** →
   custom redirect URI `http://localhost:47821`. The app always listens on
   that port (`REDIRECT_PORT` in `src-tauri/src/onedrive/loopback.rs`). If
   another program holds it, Connect says so instead of failing silently.
3. API permissions: Microsoft Graph → delegated `Files.ReadWrite.AppFolder`,
   `User.Read`, `offline_access`.
4. Put the Application (client) ID in the project `.env` as
   `ONEDRIVE_CLIENT_ID=...`. It's a public client ID, not a secret. There is
   no client secret.

### Live check (once `ONEDRIVE_CLIENT_ID` is set)
The app registration's Redirect URI must be exactly
`http://localhost:47821` (Mobile and desktop platform).
Run on the newest built `.app` (`npm run app:build`), with at least two
Performance Review videos, one added today and one older than 14 days
(set its file date back). Back up the app data folder first. Each step
passes only if what's listed is true. Look in OneDrive on the web under
`Apps/Master's Wheel/`.
1. **Connect.** Settings › Storage › Connect opens the Microsoft login.
   The browser returns to `http://localhost:47821/?code=…` and shows
   "You can close this tab." After sign-in the panel shows the account, the app folder exists with
   `<Space>/<Section>/` folders and `manifest.json`, and the status line
   appears in the video list.
2. **Backup (default).** Both videos upload (the numbers line counts down
   to "all safe"). Both are in OneDrive under their month folder and both
   are still on this Mac.
3. **Always in cloud.** The switch sheet lists both videos. After you
   confirm, the local files are gone only once OneDrive has them. Both
   still list and play ("streaming" from OneDrive). Quit and reopen: still
   playable.
4. **Smart.** The switch brings the recent video home and leaves the old
   one in OneDrive. Opening the old one plays it and brings it home when
   there's room.
5. **Backup again.** Everything comes home. The radio stays on the chosen
   mode the whole time.
6. **Offline.** Turn Wi-Fi off: the status line says offline and nothing
   is lost. Turn it on: work resumes by itself.
7. **Remove.** Delete a record: its OneDrive copy disappears.
8. **Disconnect.** In Always in cloud, "Download and disconnect" brings
   every video home, then shows the disconnected screen. "Stop
   disconnecting" cancels it. Reconnect, then plain "Disconnect" switches
   at once and leaves the videos in OneDrive. Reconnecting the same
   account uploads nothing twice.

## Decisions
- **Rust owns all tokens and every Graph call.** The webview only ever sees
  `{ configured, connected, account }`. Token exchange can't run from the
  webview anyway: Microsoft only allows cross-origin token redemption for
  "SPA" registrations, and a desktop app is a public "Mobile and desktop"
  client.
- **HTTP via `curl`**, the same pattern `transcribe.rs` uses. Secrets (auth
  code, refresh token, bearer token) go in through stdin as a curl config,
  never through argv.
- **App folder (`special/approot`), not the whole drive.** It's the least
  privilege and needs no folder picker. OneDrive names the folder after the
  app registration.
- **Layout**: `<Space folder>/<Section>/<YYYY-MM>/`, with sections
  `Performance Reviews`, `Voice Training` and `Frame Drills`. The Space
  level mirrors the on-disk Space isolation. Month folders are only created
  when the first video for that month uploads (phase 2); connecting creates
  the Space and section folders.
- **Keychain via `security-framework`** (already in Cargo.lock through
  Tauri). One generic-password item holds the refresh token plus the
  account's display name, as JSON.
