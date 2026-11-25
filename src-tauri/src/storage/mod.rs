// What happens to record videos when OneDrive is connected (SPEC §7):
// background resumable uploads, the Backup / Smart / Always in cloud modes,
// and bringing videos back or streaming them.
//   model.rs   - Video, Mode, Receipt: what the engine knows per video
//   policy.rs  - the rules, as one pure function: what happens next?
//   ledger.rs  - that knowledge saved across restarts, and synced with disk
//   scan.rs    - finds record videos on this Mac
//   layout.rs  - where a video goes in OneDrive
//   room.rs    - free-space guard for downloads
//   cloud.rs   - the OneDrive calls the engine needs (trait + Graph)
//   work.rs    - carries out one step (upload a chunk, check, download...)
//   engine.rs  - state, planning, and applying each step's outcome
//   local.rs   - file operations on this Mac (webloc, chunks)
//   status.rs  - the overview the UI shows
//   service.rs - the background worker thread
//   commands.rs - Tauri commands

pub mod cloud;
pub mod commands;
mod engine;
mod layout;
mod ledger;
mod local;
mod model;
mod policy;
mod room;
mod scan;
pub mod service;
mod status;
mod work;

#[cfg(test)]
mod engine_tests;
#[cfg(test)]
mod fake_cloud;
#[cfg(test)]
mod testdir;

pub use service::StorageService;
