# ONEDRIVE — wiki

Durable decisions and lessons. The roadmap and live status live in
`update v1.md`.

## Where the code lives
- `src-tauri/src/onedrive/`: one file per job. `pkce.rs` (verifier and
  challenge), `auth.rs` (authorize URL, token request and response),
  `loopback.rs` (the one-shot `http://localhost:47821` redirect listener),
  `curl.rs` (runs curl with its config on stdin), `graph.rs` (app-folder
  calls: `me`, `special/approot`, create folder), `token_store.rs`
  (Keychain), `session.rs` (in-memory access token plus refresh),
  `commands.rs` (the Tauri commands the webview calls), `error.rs`.
- `src-tauri/src/storage/`: the video storage engine. `model.rs` (Video,
  Mode), `policy.rs` (pure: video + conditions → next step), `ledger.rs`
  (persisted state + reconcile with a disk scan), `scan.rs`, `layout.rs`
  (cloud paths, mirrors layout.ts), `room.rs` (free-space rules),
  `cloud.rs` (the `Cloud` trait + Graph implementation + error sorting),
  `engine.rs` (plans the next job, applies results), `work.rs` (runs a
  job: upload chunk, check, offload, download, delete), `service.rs`
  (worker thread, Tauri state), `status.rs` (what the UI reads),
  `commands.rs`. Tests: `engine_tests.rs` with `fake_cloud.rs`.
- `src/lib/onedrive/`: `layout.ts` (folder paths and manifest, pure),
  `storage.ts` (storage command wrappers) and `index.ts` (sign-in
  wrappers; connect/disconnect wake the storage engine).
- UI: `src/elements/Settings/children/StoragePanel/`.

## Decisions
- **Rust owns tokens.** The webview only ever sees
  `{ configured, connected, account }`. Microsoft only allows cross-origin
  token redemption for SPA registrations, so a desktop public client must
  redeem in native code anyway.
- **curl, secrets on stdin.** Auth codes, refresh tokens and bearer tokens
  go in as a curl `--config -` on stdin, never in argv (`ps` would show
  them). Config values are escaped by `curl.rs`, which has its own tests.
- **App folder only** (`Files.ReadWrite.AppFolder`). It's least privilege,
  needs no folder picker, and OneDrive names the folder after the Azure
  app registration, not after anything in our code.
- **Layout**: `<Space>/<Section>/<YYYY-MM>/` plus `manifest.json` at the
  app-folder root. Connecting creates the Space and section folders. Month
  folders come with the first upload (phase 2).
- **Space renames.** Videos are keyed by Space id + record id, and an
  uploaded video is found again by its OneDrive item id, so renaming a
  Space never loses one. New uploads after a rename go under the new
  folder name.
- **The one safety rule.** A local copy is deleted only when the video has
  a receipt, a fresh check says OneDrive's copy has the same size, the
  video isn't open, and we're online. Every mode goes through
  `policy::next_step`, so the rule lives in one place; a changed local
  file loses its receipt and is uploaded again.
- **Streaming = 302.** The media server redirects a missing hero file to
  OneDrive's pre-signed download URL. No proxy, no cache to evict, and
  Range requests work.
- **One mode for the app**, not per Space (simpler; nobody asked for
  per-Space modes).

## Lessons and gotchas
- **Keychain prompts on rebuilds.** The app is unsigned, so every rebuild
  is a "new" app to the Keychain, and macOS asks once to allow access to
  the stored item. That's expected in development, not a bug.
- **Fixed redirect port 47821.** The user asked for one exact, rarely used
  port instead of a random one: the loopback always binds
  `REDIRECT_PORT` (loopback.rs) and the registered Redirect URI is
  `http://localhost:47821`. A busy port becomes `PortBusy` (kind
  `portBusy`), whose Rust sentence the Storage panel shows as is.
- **The client ID ships in the build** (`auth::CLIENT_ID`). It's a public
  client ID, not a secret. `.env` is read from the folder the app was
  built in, so a `.env`-only ID vanished from builds made anywhere else.
  `ONEDRIVE_CLIENT_ID` still overrides it for a different registration.
- **Personal accounts only → `/consumers`.** The registration allows
  personal Microsoft accounts only. On `/common` Microsoft refuses every
  token request for it (AADSTS9002331, "use the /consumers endpoint"),
  so `auth::AUTHORITY` is `/consumers`. Widen the registration to work
  accounts too and it can go back to `/common`.
- **Rust tests run via `npm run test:rust`** (cargo is refused in the agent
  shell). `npm run test:all` runs both suites and is the `.project` test
  line.
