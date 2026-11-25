// The storage engine's state and decisions: which job comes next (plan),
// and what a finished job means for the ledger (finish). The slow part of
// each job runs in work.rs, outside the lock the service holds around this.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::cloud::CloudError;
use super::ledger::Ledger;
use super::local;
use super::model::{Mode, Problem, UploadSession, Video};
use super::policy::{Conditions, Step, next_step};
use super::room::DiskSpace;
use super::scan::Found;
use super::work::{Job, Outcome, part_path};

const OFFLINE_RETRY_SECONDS: u64 = 30;
const FULL_RETRY_SECONDS: u64 = 10 * 60;
const MAX_BACKOFF_SECONDS: u64 = 15 * 60;

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Health {
    pub offline_until: u64,
    pub full_until: u64,
    pub signed_in: bool,
    pub revoked: bool,
}

#[derive(Debug, Clone, Copy, Default)]
struct Backoff {
    attempts: u32,
    until: u64,
}

pub struct Engine {
    pub ledger: Ledger,
    pub health: Health,
    wheel_root: PathBuf,
    // Videos playing or being transcribed (rule 3), with a use count.
    pins: HashMap<String, u32>,
    backoff: HashMap<String, Backoff>,
}

impl Engine {
    pub fn new(ledger: Ledger, wheel_root: PathBuf) -> Self {
        Self { ledger, health: Health::default(), wheel_root, pins: HashMap::new(), backoff: HashMap::new() }
    }

    pub fn wheel_root(&self) -> &Path {
        &self.wheel_root
    }

    pub fn online(&self, now: u64) -> bool {
        now >= self.health.offline_until
    }

    pub fn cloud_full(&self, now: u64) -> bool {
        now < self.health.full_until
    }

    pub fn reconcile(&mut self, found: &[Found]) {
        self.ledger.reconcile(found);
    }

    // The account just signed in (or was read at start). A different
    // account can't vouch for copies this Mac still has.
    pub fn set_account(&mut self, account: Option<String>) {
        self.health.signed_in = account.is_some();
        self.health.revoked = false;
        let Some(name) = account else { return };
        if self.ledger.account.as_deref().is_some_and(|old| old != name) {
            log::info!(target: "storage", "[account] switched; on-Mac videos upload again");
            for video in self.ledger.videos.values_mut().filter(|v| v.on_mac) {
                video.receipt = None;
                video.upload = None;
                video.awaiting_check = None;
            }
        }
        self.ledger.account = Some(name);
    }

    pub fn set_mode(&mut self, mode: Mode) {
        log::info!(target: "storage", "[mode] {:?} -> {mode:?}", self.ledger.mode);
        self.ledger.mode = mode;
    }

    // Back online, signed in again, or "Try again": retry everything now.
    pub fn wake(&mut self) {
        self.health.offline_until = 0;
        self.health.full_until = 0;
        self.health.revoked = false;
        self.backoff.clear();
    }

    pub fn retry_unreadable(&mut self) {
        for video in self.ledger.videos.values_mut() {
            if video.problem == Some(Problem::Unreadable) {
                video.problem = None;
            }
        }
        self.wake();
    }

    pub fn key_for_path(&self, path: &Path) -> Option<String> {
        self.ledger
            .videos
            .values()
            .find(|v| v.local_path(&self.wheel_root) == path || v.record_dir(&self.wheel_root) == path)
            .map(Video::key)
    }

    pub fn pin(&mut self, key: &str) {
        *self.pins.entry(key.to_string()).or_default() += 1;
    }

    pub fn unpin(&mut self, key: &str) {
        if let Some(count) = self.pins.get_mut(key) {
            *count -= 1;
            if *count == 0 {
                self.pins.remove(key);
            }
        }
    }

    // Opening a video counts as watching it for Smart — but a cloud video
    // only counts if there's room to bring it home (rule 5).
    pub fn video_opened(&mut self, key: &str, now: u64, disk: Option<DiskSpace>) {
        self.pin(key);
        let mode = self.ledger.mode;
        if let Some(video) = self.ledger.videos.get_mut(key) {
            if video.on_mac || room_for(video, mode, disk) {
                video.last_watched_at = Some(now);
            }
        }
    }

    pub fn video_removed(&mut self, key: &str) {
        let Some(video) = self.ledger.videos.get_mut(key) else { return };
        if video.receipt.is_none() && video.awaiting_check.is_none() {
            // Nothing in OneDrive to clean up.
            self.ledger.videos.remove(key);
            return;
        }
        video.removed = true;
        video.upload = None;
    }

    pub fn conditions(&self, video: &Video, now: u64, disk: Option<DiskSpace>) -> Conditions {
        let mode = self.ledger.mode;
        Conditions {
            mode,
            now,
            online: self.online(now),
            signed_in: self.health.signed_in && !self.health.revoked,
            cloud_full: self.cloud_full(now),
            in_use: self.pins.contains_key(&video.key()),
            room_ok: room_for(video, mode, disk),
        }
    }

    pub fn plan(&self, now: u64, disk: Option<DiskSpace>) -> Option<Job> {
        self.ledger
            .videos
            .iter()
            .filter(|(key, _)| self.backoff.get(*key).is_none_or(|b| now >= b.until))
            .map(|(key, video)| (key, video, next_step(video, &self.conditions(video, now, disk))))
            .filter(|(_, _, step)| *step != Step::Wait)
            .min_by_key(|(_, video, step)| priority(video, *step))
            .map(|(key, video, step)| Job { key: key.clone(), step, video: video.clone() })
    }

    pub fn finish(&mut self, job: &Job, outcome: Outcome, now: u64, disk: Option<DiskSpace>) {
        log::info!(target: "storage", "[{}] {:?} -> {}", job.key, job.step, describe(&outcome));
        if let Outcome::Failed(error) = outcome {
            return self.failed(&job.key, error, now);
        }
        self.backoff.remove(&job.key);
        if job.step == Step::Offload && outcome == Outcome::OffloadReady {
            return self.offload(&job.key, now, disk);
        }
        let wheel_root = self.wheel_root.clone();
        let Some(video) = self.ledger.videos.get_mut(&job.key) else { return };
        apply(video, &job.video, outcome, &wheel_root);
        if video.removed && video.receipt.is_none() && video.awaiting_check.is_none() {
            self.ledger.videos.remove(&job.key);
        }
    }

    fn failed(&mut self, key: &str, error: CloudError, now: u64) {
        match error {
            CloudError::Offline(_) => self.health.offline_until = now + OFFLINE_RETRY_SECONDS,
            CloudError::SignedOut => self.health.signed_in = false,
            CloudError::Revoked => self.health.revoked = true,
            CloudError::Full => self.health.full_until = now + FULL_RETRY_SECONDS,
            CloudError::NotFound => {
                // Only downloads surface this: OneDrive lost a cloud-only video.
                if let Some(video) = self.ledger.videos.get_mut(key) {
                    video.problem = Some(Problem::Missing);
                }
            }
            CloudError::RangeMismatch | CloudError::Transient(_) => {
                let b = self.backoff.entry(key.to_string()).or_default();
                b.attempts += 1;
                b.until = now + (5u64 << b.attempts.min(8)).min(MAX_BACKOFF_SECONDS);
            }
        }
    }

    // The cloud copy was just confirmed; the local one goes only if every
    // rule still says so now, under the lock.
    fn offload(&mut self, key: &str, now: u64, disk: Option<DiskSpace>) {
        let Some(video) = self.ledger.videos.get(key) else { return };
        let still = next_step(video, &self.conditions(video, now, disk)) == Step::Offload;
        let local = video.local_path(&self.wheel_root);
        let matches = video.receipt.as_ref().is_some_and(|r| local::file_size(&local) == Some(r.size));
        if !still || !matches {
            return;
        }
        let record_dir = video.record_dir(&self.wheel_root);
        let url = video.receipt.as_ref().map(|r| r.web_url.clone()).unwrap_or_default();
        if let Err(e) = local::write_webloc(&record_dir, &url) {
            log::warn!(target: "storage", "[{key}] offload: webloc: {e}");
        }
        match std::fs::remove_file(&local) {
            Ok(()) => self.ledger.videos.get_mut(key).expect("checked above").on_mac = false,
            Err(e) => log::warn!(target: "storage", "[{key}] offload: removing {}: {e}", local.display()),
        }
    }
}

fn apply(video: &mut Video, planned: &Video, outcome: Outcome, wheel_root: &Path) {
    let same_session = video.upload.as_ref().map(|s| &s.url) == planned.upload.as_ref().map(|s| &s.url);
    match outcome {
        Outcome::SessionStarted(url) if video.upload.is_none() && video.size == planned.size => {
            video.upload = Some(UploadSession { url, next_offset: 0 });
        }
        Outcome::Sent { url, next } if same_session => video.upload = Some(UploadSession { url, next_offset: next }),
        Outcome::Uploaded(item) if same_session && video.size == planned.size => {
            video.upload = None;
            video.awaiting_check = Some(item.id);
        }
        Outcome::SessionLost => video.upload = None,
        Outcome::Confirmed(receipt) if video.awaiting_check == planned.awaiting_check => {
            video.awaiting_check = None;
            video.receipt = Some(receipt);
            video.problem = None;
        }
        Outcome::CheckFailed => {
            video.awaiting_check = None;
            video.receipt = None;
        }
        Outcome::Downloaded => bring_home(video, wheel_root),
        Outcome::Deleted => {
            video.receipt = None;
            video.awaiting_check = None;
        }
        Outcome::Unreadable(_) => {
            video.upload = None;
            video.problem = Some(Problem::Unreadable);
        }
        _ => {}
    }
}

fn bring_home(video: &mut Video, wheel_root: &Path) {
    let key = video.key();
    let target = video.local_path(wheel_root);
    match std::fs::rename(part_path(video, wheel_root), &target) {
        Ok(()) => {
            local::remove_webloc(&video.record_dir(wheel_root));
            video.on_mac = true;
        }
        Err(e) => log::warn!(target: "storage", "[{key}] download: moving into place: {e}"),
    }
}

fn room_for(video: &Video, mode: Mode, disk: Option<DiskSpace>) -> bool {
    disk.is_some_and(|d| d.has_room_for(video.size, mode))
}

// Quick, safety-related steps first; a started upload before a new one.
fn priority(video: &Video, step: Step) -> (u8, u64) {
    let rank = match step {
        Step::Check => 0,
        Step::DeleteInCloud => 1,
        Step::Offload => 2,
        Step::Upload if video.upload.is_some() => 3,
        Step::Upload => 4,
        Step::Download => 5,
        Step::Wait => 9,
    };
    (rank, u64::MAX - video.last_watched_at.unwrap_or(video.added_at))
}

fn describe(outcome: &Outcome) -> String {
    match outcome {
        Outcome::SessionStarted(_) => "session started".into(),
        Outcome::Sent { next, .. } => format!("sent up to {next}"),
        Outcome::Uploaded(item) => format!("uploaded as {}", item.id),
        other => format!("{other:?}"),
    }
}
