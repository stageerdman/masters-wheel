# Smart mode freeze and wrong storage sizes — update v1

## Goal
Settings › Storage with OneDrive connected: (1) pressing Smart hangs the
app until force-quit; (2) the numbers line reads "On this Mac: 1 MB · In
OneDrive: 1 MB" while the user has 119 videos (66 GB).

## Root causes (found by reading the code and the user's real ledger)
1. **Deadlock in the storage worker.** `service.rs` `run()` does
   `self.engine().finish(&job, outcome, unix_now(), self.disk())`. The
   engine guard is taken for the receiver, then `self.disk()` locks the
   same std `Mutex` again → the worker deadlocks holding the engine lock
   after its very first job. The real ledger proves it: 119 videos, not one
   has an upload session recorded. Every storage command is a *sync*
   Tauri command, which runs on the main thread; the next one that locks
   the engine (pressing Smart → `storage_preview_switch`) blocks the main
   thread forever → frozen app.
2. **Stale, empty overview + a fake floor.** The panel's first overview is
   read before the worker's first scan. `rescan()` reconciles and saves
   but never emits `storage://changed`, and the deadlock stops all later
   events, so the webview keeps `videos: []`. `formatBytes(0)` then shows
   `Math.max(1, …)` = "1 MB" for both totals.

## Phases
1. Roadmap (this file).
2. Fix the deadlock: read disk space before taking the engine lock.
   Test: a service with many videos finishes a job and a mode switch while
   other threads read — completes within a timeout.
3. Keep the UI thread free: storage commands run off the main thread
   (async + blocking pool), so even a slow engine can't freeze the window.
4. Real totals: `rescan` tells the webview when it changed the ledger;
   `formatBytes(0)` says "0 MB". Tests: scanned file sizes add up to the
   overview totals; panelText formats zero honestly.
5. Rebuild the app (`npm run app:start` target), push.

## Status
- [x] Phase 1
- [x] Phase 2 — `finish_job` reads disk first; test with 150 videos + Smart switch under a 5 s timeout.
- [x] Phase 3 — every storage command is async on the blocking pool (`with_storage`).
- [x] Phase 4 — `rescan` emits when the ledger changed; `formatBytes(0)` = "0 MB"; totals test.
  Progress: once the worker runs, the numbers line shows "Uploading N videos · X GB left".
- [x] Phase 5 — release build installed to /Applications; branch pushed.
