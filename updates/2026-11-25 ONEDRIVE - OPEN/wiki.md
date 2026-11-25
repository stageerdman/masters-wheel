# ONEDRIVE — wiki

Durable decisions and lessons. The roadmap and live status live in
`update v1.md`.

## Where the code lives
- `src-tauri/src/onedrive/`: one file per job. `pkce.rs` (verifier and
  challenge), `auth.rs` (authorize URL, token request and response),
  `loopback.rs` (the one-shot `http://localhost:<port>` redirect listener),
  `curl.rs` (runs curl with its config on stdin), `graph.rs` (app-folder
  calls: `me`, `special/approot`, create folder), `token_store.rs`
  (Keychain), `session.rs` (in-memory access token plus refresh),
  `commands.rs` (the Tauri commands the webview calls), `error.rs`.
- `src/lib/onedrive/`: `layout.ts` (folder paths and manifest, pure) and
  `index.ts` (the webview's typed wrappers around the commands).
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
- **Space renames (open for phase 2).** The manifest records each Space's
  id, name and cloud folder. Today `buildManifest` refreshes the folder
  from the Space's current folder name on every connect, so a renamed
  Space would get a new cloud folder. Before uploads land, phase 2 must
  either keep the first folder per Space id or rename the cloud folder,
  and look folders up by Space id through the manifest.

## Lessons and gotchas
- **Keychain prompts on rebuilds.** The app is unsigned, so every rebuild
  is a "new" app to the Keychain, and macOS asks once to allow access to
  the stored item. That's expected in development, not a bug.
- **Localhost redirect port.** Microsoft ignores the port for
  `http://localhost` redirect URIs on "Mobile and desktop" registrations,
  so the random free port the app binds matches the registered
  `http://localhost`.
- **Live sign-in needs `ONEDRIVE_CLIENT_ID`** in `.env`. Without it the
  Storage panel says OneDrive isn't set up and the rest of the app is
  unaffected.
- **Rust tests run via `npm run test:rust`** (cargo is refused in the agent
  shell). `npm run test:all` runs both suites and is the `.project` test
  line.
