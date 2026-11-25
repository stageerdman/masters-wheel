// The engine end to end against FakeCloud and real temp folders: every
// mode, switching modes, offline, restarts, and rule 1 (nothing leaves
// this Mac unless OneDrive confirmed it holds the whole file).

use super::cloud::CloudError;
use super::engine::Engine;
use super::fake_cloud::FakeCloud;
use super::ledger::Ledger;
use super::model::{Mode, Problem, SMART_WINDOW_SECONDS, WEBLOC_NAME};
use super::policy::Step;
use super::room::DiskSpace;
use super::scan::scan;
use super::testdir::TestDir;
use super::work::{Context, perform};

const DAY: u64 = 24 * 60 * 60;
const T0: u64 = 1_764_000_000;
const ROOMY: Option<DiskSpace> = Some(DiskSpace { free: 900_000_000_000, total: 1_000_000_000_000 });
const FULL_DISK: Option<DiskSpace> = Some(DiskSpace { free: 1_000, total: 1_000_000_000_000 });
const KEY: &str = "s1/r1";
const BYTES: &str = "0123456789abcdefghij";

struct World {
    dir: TestDir,
    cloud: FakeCloud,
    engine: Engine,
}

impl World {
    fn new(mode: Mode) -> Self {
        let dir = TestDir::new("engine");
        dir.write("spaces.json", r#"{"spaces":[{"id":"s1","folderName":"Acme"}]}"#);
        dir.write("Acme/records/r1/hero.mp4", BYTES);
        let mut engine = Engine::new(Ledger::default(), dir.path().into());
        engine.set_mode(mode);
        engine.set_account(Some("me@example.com".into()));
        let mut world = Self { dir, cloud: FakeCloud::default(), engine };
        world.rescan();
        world.engine.ledger.videos.get_mut(KEY).unwrap().added_at = T0;
        world
    }

    fn rescan(&mut self) {
        let found = scan(self.dir.path()).unwrap();
        self.engine.reconcile(&found);
    }

    fn context(&self) -> Context {
        Context { wheel_root: self.dir.path().into(), scratch: self.dir.path().join(".scratch"), chunk_size: 6 }
    }

    // Runs one job; returns its step, or None when there's nothing to do.
    fn step(&mut self, now: u64, disk: Option<DiskSpace>) -> Option<Step> {
        let job = self.engine.plan(now, disk)?;
        let outcome = perform(&job, &self.cloud, &self.context());
        self.engine.finish(&job, outcome, now, disk);
        Some(job.step)
    }

    fn settle(&mut self, now: u64, disk: Option<DiskSpace>) -> Vec<Step> {
        let mut steps = Vec::new();
        while let Some(step) = self.step(now, disk) {
            steps.push(step);
            assert!(steps.len() < 50, "engine never settles: {steps:?}");
        }
        steps
    }

    fn local_exists(&self) -> bool {
        self.dir.path().join("Acme/records/r1/hero.mp4").exists()
    }

    fn webloc_exists(&self) -> bool {
        self.dir.path().join("Acme/records/r1").join(WEBLOC_NAME).exists()
    }

    fn video(&self) -> &super::model::Video {
        &self.engine.ledger.videos[KEY]
    }

    fn cloud_bytes(&self) -> Vec<u8> {
        self.cloud.bytes(&self.video().receipt.as_ref().expect("receipt").item_id).expect("item in cloud")
    }
}

#[test]
fn backup_uploads_in_chunks_and_keeps_both_copies() {
    let mut w = World::new(Mode::Backup);
    let steps = w.settle(T0 + 30 * DAY, ROOMY);
    assert_eq!(steps.iter().filter(|s| **s == Step::Upload).count(), 1 + 4); // session + 20 bytes / 6
    assert_eq!(w.cloud_bytes(), BYTES.as_bytes());
    assert!(w.local_exists() && w.video().on_mac && !w.webloc_exists());
}

#[test]
fn always_in_cloud_removes_the_local_copy_only_after_the_receipt() {
    let mut w = World::new(Mode::AlwaysInCloud);
    while w.video().receipt.is_none() {
        w.step(T0, ROOMY).expect("still uploading");
        assert!(w.local_exists(), "local copy left before the upload was confirmed");
    }
    assert_eq!(w.settle(T0, ROOMY), vec![Step::Offload]);
    assert!(!w.local_exists() && !w.video().on_mac && w.webloc_exists());
    w.rescan();
    assert!(w.engine.ledger.videos.contains_key(KEY), "a cloud video stays tracked after a rescan");
}

#[test]
fn always_in_cloud_keeps_a_video_that_is_playing_or_transcribing() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.engine.pin(KEY);
    w.settle(T0, ROOMY);
    assert!(w.local_exists() && w.video().is_safe());
    w.engine.unpin(KEY);
    assert_eq!(w.settle(T0, ROOMY), vec![Step::Offload]);
    assert!(!w.local_exists());
}

#[test]
fn smart_keeps_fourteen_days_then_brings_it_home_when_watched() {
    let mut w = World::new(Mode::Smart);
    w.settle(T0 + DAY, ROOMY);
    assert!(w.local_exists() && w.video().is_safe());

    let later = T0 + SMART_WINDOW_SECONDS;
    assert_eq!(w.settle(later, ROOMY), vec![Step::Offload]);
    assert!(!w.local_exists());

    w.engine.video_opened(KEY, later + DAY, ROOMY);
    assert_eq!(w.settle(later + DAY, ROOMY), vec![Step::Download]);
    assert!(w.local_exists() && !w.webloc_exists());
    assert_eq!(std::fs::read(w.dir.path().join("Acme/records/r1/hero.mp4")).unwrap(), BYTES.as_bytes());

    w.engine.unpin(KEY);
    assert!(w.settle(later + 14 * DAY, ROOMY).is_empty(), "watched 13 days ago: stays");
    assert_eq!(w.settle(later + 15 * DAY, ROOMY), vec![Step::Offload]);
}

#[test]
fn smart_only_streams_when_there_is_no_room() {
    let mut w = World::new(Mode::Smart);
    let later = T0 + SMART_WINDOW_SECONDS;
    w.settle(later, ROOMY);
    assert!(!w.local_exists());
    w.engine.video_opened(KEY, later + DAY, FULL_DISK);
    assert_eq!(w.video().last_watched_at, None, "the 14-day timer isn't reset");
    w.engine.unpin(KEY);
    assert!(w.settle(later + DAY, ROOMY).is_empty());
}

#[test]
fn switching_backup_to_always_in_cloud_and_back() {
    let mut w = World::new(Mode::Backup);
    w.settle(T0, ROOMY);
    w.engine.set_mode(Mode::AlwaysInCloud);
    assert_eq!(w.settle(T0, ROOMY), vec![Step::Offload]);
    w.engine.set_mode(Mode::Backup);
    assert_eq!(w.settle(T0, ROOMY), vec![Step::Download]);
    assert!(w.local_exists() && w.video().on_mac && w.video().is_safe());
}

#[test]
fn switching_always_in_cloud_to_smart_brings_back_only_recent_videos() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.dir.write("Acme/records/r2/hero.mp4", "old video");
    w.rescan();
    w.engine.ledger.videos.get_mut("s1/r2").unwrap().added_at = T0 - 30 * DAY;
    w.settle(T0, ROOMY);
    assert_eq!(w.cloud.item_count(), 2);
    assert!(w.engine.ledger.videos.values().all(|v| !v.on_mac));

    w.engine.set_mode(Mode::Smart);
    assert_eq!(w.settle(T0 + DAY, ROOMY), vec![Step::Download]);
    assert!(w.video().on_mac && !w.engine.ledger.videos["s1/r2"].on_mac);

    w.engine.set_mode(Mode::Backup);
    assert_eq!(w.settle(T0 + DAY, ROOMY), vec![Step::Download]);
    assert!(w.engine.ledger.videos.values().all(|v| v.on_mac));
}

#[test]
fn switching_modes_mid_upload_never_drops_the_unconfirmed_copy() {
    let mut w = World::new(Mode::Backup);
    w.step(T0, ROOMY);
    w.step(T0, ROOMY);
    assert_eq!(w.video().upload.as_ref().unwrap().next_offset, 6);
    w.engine.set_mode(Mode::AlwaysInCloud);
    w.step(T0, ROOMY);
    w.engine.set_mode(Mode::Smart);
    let steps = w.settle(T0 + 20 * DAY, ROOMY);
    assert_eq!(steps.last(), Some(&Step::Offload));
    assert_eq!(w.cloud.sessions_started(), 1, "the upload carried on rather than restarting");
    assert_eq!(w.cloud.bytes(&w.video().receipt.as_ref().unwrap().item_id).unwrap(), BYTES.as_bytes());
}

#[test]
fn offline_nothing_moves_and_it_continues_when_back() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.step(T0, ROOMY);
    w.cloud.fail_with(Some(CloudError::Offline("no network".into())));
    w.step(T0, ROOMY);
    assert!(!w.engine.online(T0));
    assert!(w.engine.plan(T0 + 10, ROOMY).is_none(), "waits while offline");
    w.cloud.fail_with(None);
    w.engine.wake();
    w.settle(T0 + 10, ROOMY);
    assert!(!w.local_exists() && w.cloud.sessions_started() == 1);
}

#[test]
fn a_safe_video_is_not_offloaded_while_offline() {
    let mut w = World::new(Mode::Backup);
    w.settle(T0, ROOMY);
    w.cloud.fail_with(Some(CloudError::Offline("no network".into())));
    w.engine.set_mode(Mode::AlwaysInCloud);
    w.settle(T0, ROOMY);
    assert!(w.local_exists() && w.video().on_mac);
}

#[test]
fn an_incomplete_cloud_copy_is_uploaded_again_never_offloaded() {
    let mut w = World::new(Mode::AlwaysInCloud);
    while w.video().awaiting_check.is_none() {
        w.step(T0, ROOMY);
    }
    let id = w.video().awaiting_check.clone().unwrap();
    w.cloud.truncate_item(&id);
    assert_eq!(w.step(T0, ROOMY), Some(Step::Check));
    assert!(w.local_exists() && !w.video().is_safe());
    w.settle(T0, ROOMY);
    assert!(!w.local_exists() && w.cloud.sessions_started() == 2);
}

#[test]
fn a_receipt_is_rechecked_right_before_offloading() {
    let mut w = World::new(Mode::Backup);
    w.settle(T0, ROOMY);
    let id = w.video().receipt.clone().unwrap().item_id;
    w.cloud.remove_item(&id);
    w.engine.set_mode(Mode::AlwaysInCloud);
    assert_eq!(w.step(T0, ROOMY), Some(Step::Offload));
    assert!(w.local_exists() && !w.video().is_safe(), "deleted in OneDrive: kept and re-uploaded");
    w.settle(T0, ROOMY);
    assert!(!w.local_exists());
}

#[test]
fn uploads_resume_after_a_restart() {
    let mut w = World::new(Mode::Backup);
    w.step(T0, ROOMY);
    w.step(T0, ROOMY);
    let path = w.dir.path().join("onedrive/videos.json");
    w.engine.ledger.save(&path).unwrap();

    let mut engine = Engine::new(Ledger::load(&path).unwrap(), w.dir.path().into());
    engine.set_account(Some("me@example.com".into()));
    w.engine = engine;
    w.settle(T0, ROOMY);
    assert_eq!(w.cloud.sessions_started(), 1);
    assert_eq!(w.cloud_bytes(), BYTES.as_bytes());
}

#[test]
fn signed_out_or_full_videos_wait_on_this_mac() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.cloud.fail_with(Some(CloudError::Full));
    w.step(T0, ROOMY);
    assert!(w.engine.plan(T0, ROOMY).is_none());
    w.cloud.fail_with(Some(CloudError::SignedOut));
    w.engine.wake();
    w.step(T0, ROOMY);
    assert!(w.engine.plan(T0, ROOMY).is_none() && w.local_exists());
}

#[test]
fn a_video_deleted_in_onedrive_and_not_here_is_missing() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.settle(T0, ROOMY);
    let id = w.video().receipt.clone().unwrap().item_id;
    w.cloud.remove_item(&id);
    w.engine.set_mode(Mode::Backup);
    w.settle(T0, ROOMY);
    assert_eq!(w.video().problem, Some(Problem::Missing));
}

#[test]
fn removing_a_video_deletes_it_in_onedrive() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.settle(T0, ROOMY);
    w.engine.video_removed(KEY);
    assert_eq!(w.settle(T0, ROOMY), vec![Step::DeleteInCloud]);
    assert_eq!(w.cloud.item_count(), 0);
    assert!(!w.engine.ledger.videos.contains_key(KEY));
}

#[test]
fn an_unreadable_file_waits_for_try_again() {
    let mut w = World::new(Mode::Backup);
    w.step(T0, ROOMY);
    std::fs::write(w.dir.path().join("Acme/records/r1/hero.mp4"), "short").unwrap();
    w.step(T0, ROOMY);
    assert_eq!(w.video().problem, Some(Problem::Unreadable));
    assert!(w.engine.plan(T0, ROOMY).is_none());
    w.engine.retry_unreadable();
    assert!(w.engine.plan(T0, ROOMY).is_some());
}

#[test]
fn a_different_account_uploads_on_mac_videos_again() {
    let mut w = World::new(Mode::Backup);
    w.settle(T0, ROOMY);
    w.engine.set_account(Some("other@example.com".into()));
    assert!(!w.video().is_safe());
    w.settle(T0, ROOMY);
    assert!(w.video().is_safe());
}

#[test]
fn download_and_disconnect_brings_every_video_home_first() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.settle(T0, ROOMY);
    assert!(!w.local_exists());
    w.engine.set_disconnecting(true);
    assert!(!w.engine.disconnect_ready());
    assert_eq!(w.settle(T0, ROOMY), vec![Step::Download]);
    assert!(w.local_exists() && !w.webloc_exists());
    assert!(w.engine.disconnect_ready());
    w.engine.disconnected();
    assert!(!w.engine.ledger.connected && !w.engine.health.signed_in && !w.engine.ledger.disconnecting);
    assert_eq!(w.cloud.item_count(), 1, "nothing in OneDrive is deleted");
}

#[test]
fn disconnecting_pauses_uploads_and_offloads_until_stopped() {
    let mut w = World::new(Mode::AlwaysInCloud);
    w.engine.set_disconnecting(true);
    assert!(w.engine.plan(T0, ROOMY).is_none());
    w.engine.set_disconnecting(false);
    w.settle(T0, ROOMY);
    assert!(!w.local_exists() && w.video().is_safe());
}

#[test]
fn an_expired_sign_in_is_not_a_disconnect() {
    let mut w = World::new(Mode::Backup);
    w.engine.set_account(None);
    assert!(w.engine.ledger.connected, "signed out, still connected");
    w.engine.disconnected();
    assert!(!w.engine.ledger.connected);
    w.engine.set_account(Some("me@example.com".into()));
    assert!(w.engine.ledger.connected);
}
