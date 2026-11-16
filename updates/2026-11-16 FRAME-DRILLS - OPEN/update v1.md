# FRAME-DRILLS — a new Training Room discipline

**Date:** 2026-11-16
**Status:** OPEN

## Goal
Add **Frame Drills** as a sixth Training Room discipline: write the frame
(text) you want to drill, press play to record yourself saying it against
an optional timer, and keep reusable frames as Space-wide templates.

## Spec (dictated 2026-11-16)
- **Hero** (Voice-Training-style feed, newest on top, `+` pinned above):
  each drill is a card with its own text, its own play button (records
  audio), and its own timer select next to play.
  - Play starts recording *and* the timer at the same moment. When the
    timer hits zero a notification pops; if the user keeps going the
    clock runs into minus (`-0:05`). Stop ends the take.
  - Only one drill can record at a time — every other play button is
    disabled while one runs.
  - `+` adds a new empty drill to drill next.
  - A small "save as template" icon next to the text: save as a new
    template, or overwrite an existing one.
- **Detail**: every saved template ("all available frames"). Clicking one
  adds it to the Hero as a new drill.

## Decisions (made without asking — sensible defaults, flagged to user)
- "Notification" = an in-app pop on the drill card, not a macOS system
  notification: the user is looking at the window while drilling, and an
  audible chime would bleed into the recording.
- Each stop saves a **take** (`.m4a` in the session folder) shown under its
  drill with a small player — recording audio you can't hear back has no
  point. Takes accumulate; nothing gets silently overwritten.
- Templates are Space-wide (`<Space>/frame-templates.json`), not
  per-session — the whole point is reuse across sessions.
- Detail keeps Notes as a second split-rail kind (Frames on top), same as
  Chat Roleplay's Trainer + Notes.
- Right-click removes a drill (deletes its takes) / a template.
- Recording uses the webview's own `getUserMedia` + `MediaRecorder` (wry
  grants WKWebView media-capture by default); `src-tauri/Info.plist` adds
  `NSMicrophoneUsageDescription` so macOS can prompt for the mic.

## Roadmap
1. [x] Data + storage: `frameDrills` on session.json, take files, Space-
   wide templates file, pure helpers in `src/lib/frameDrills`.
2. [x] Discipline registration: type, picker card, icon, color.
3. [x] Hero: drill cards, recorder, single-active rule, timer/overtime,
   time-up pop, takes playback, save-as-template popover.
4. [x] Detail: generalized Training Room `Detail` (kind order + render
   slot) — Voice Training, Chat Roleplay and Frame Drills share it.
5. [x] MCP: `get_training_session` includes drill texts in `notes`.
6. [x] Tests: clock formatting, template upsert, state parsing.
7. [x] Rebuilt + reinstalled the `.app`; mic string confirmed in its Info.plist.
8. [ ] User verifies the live flow (mic prompt, record, timer, templates).
