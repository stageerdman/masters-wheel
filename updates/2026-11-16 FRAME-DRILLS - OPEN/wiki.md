# FRAME-DRILLS — wiki

## Recording in the webview, not Rust
- wry 0.57's WKWebView UI delegate answers
  `requestMediaCapturePermissionForOrigin` with **Grant** when no custom
  permission handler is set (checked in
  `wry-0.57.2/src/wkwebview/class/wry_web_view_ui_delegate.rs`), so plain
  `navigator.mediaDevices.getUserMedia` works with no Rust code. macOS
  still gates the mic at the process level (TCC), which needs
  `NSMicrophoneUsageDescription` in the bundle's Info.plist — Tauri merges
  `src-tauri/Info.plist` into the bundle automatically (confirmed with
  PlistBuddy on the built `.app`). Without that key macOS kills the app on
  first mic access instead of prompting.
- The app is unsigned/ad-hoc signed: TCC keys the grant on the code
  signature, so a rebuild *may* ask for mic permission again.
- WKWebView's MediaRecorder writes `audio/mp4` (AAC) → stored as `.m4a`,
  which WKWebView plays back natively. A dev browser (Chrome) records
  `audio/webm`; outside Tauri the take only lives as a blob URL anyway.
- Writing binary needed a new capability: `fs:allow-write-file`, scoped
  to the Master's Wheel root like every other fs permission.

## Single writer for drill state
`updateFrameDrills` takes a functional updater and **always** goes through
the debounced `scheduleMetaWrite`. Mixing in `writeNow` for "discrete"
events was the first draft and had a real ordering bug: type a frame
(debounced write pending with the old drill list) → click "+" (immediate
write with the new drill) → 400 ms later the stale debounced write lands
and drops the new drill from disk. One path, always carrying the latest
full state, can't reorder.

## "Notification" = in-app pop
The user is looking at the window while drilling, and a sound would be
recorded into the take — so time-up is a visual pop on the card plus the
clock flipping to minus in the overtime color, not a macOS notification or
chime.

## Shared Detail
Frame Drills was the third Training Room discipline with a split-rail
Detail (Voice Training's notes-only `Detail`, Chat Roleplay's
`RoleplayDetail`). `Detail` now takes `kindOrder`, `storageKey`,
`renderKind` and `notesPlaceholder`; Chat Roleplay uses it too, keeping
its original `chat-roleplay-detail-split-<id>` storage key so saved split
layouts survive. Its pane is now `overflow: hidden` (was `auto` for
notes-only) — each pane's content scrolls itself.

## Follow-up (2026-11-16, same day)
- Timer options changed to No timer / 10–60 min in 10-minute steps,
  default 30:00 (dictated). A drill saved with an old value (e.g. 1:00)
  keeps it as an extra selectable option rather than the select silently
  showing the wrong time (`timerOptionsFor`).
- Templates have a user-given `name`, entered in the save popover; the
  Detail's frames list shows names (text as a hover tooltip). Replacing
  a template keeps its name. Templates saved before names existed fall
  back to their first line.
