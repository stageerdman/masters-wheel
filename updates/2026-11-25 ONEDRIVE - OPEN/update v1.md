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
         redirect on `http://localhost:<port>`, Microsoft Graph,
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
2. **Upload engine**
   - [ ] Resumable Graph upload sessions streamed from disk in chunks
         (multi-GB recordings), in Rust, with progress events.
   - [ ] Persistent upload queue (survives app restarts) and retry with
         backoff. Resume a half-done session from its next offset.
   - [ ] Per-video cloud state in its own meta (`cloud: { itemId, path,
         uploadedAt, size }`).
   - [ ] Tests: chunk ranges, resume offset, retry policy, queue state
         transitions.
3. **Storage modes**
   - [ ] Mode setting (Off / Backup / Always in cloud / Smart) per Space.
   - [ ] Backup: queue every new and existing video.
   - [ ] Always in cloud: after a verified upload (size matches), delete
         the local copy.
   - [ ] Smart: keep videos opened or created in the last N days locally,
         offload the rest. Never offload something that isn't uploaded.
   - [ ] Tests: the policy function (video state + mode + now → keep /
         upload / offload), with the "never delete an un-uploaded file"
         rule as its own test.
4. **Play from the cloud**
   - [ ] Opening a cloud-only video downloads it into the local cache
         (with progress), then plays it through the existing media server.
   - [ ] Smart mode evicts the cache again later.
   - [ ] Tests: cache bookkeeping, download resume.
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

### How to set up (one time)
1. Register an app at https://entra.microsoft.com → App registrations → New
   registration. Name it "Master's Wheel" (OneDrive uses this name for the
   app folder). Supported accounts: "Accounts in any organizational
   directory and personal Microsoft accounts".
2. Authentication → Add a platform → **Mobile and desktop applications** →
   custom redirect URI `http://localhost`. (Microsoft ignores the port for
   localhost, so the random port the app picks matches.)
3. API permissions: Microsoft Graph → delegated `Files.ReadWrite.AppFolder`,
   `User.Read`, `offline_access`.
4. Put the Application (client) ID in the project `.env` as
   `ONEDRIVE_CLIENT_ID=...`. It's a public client ID, not a secret. There is
   no client secret.

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
