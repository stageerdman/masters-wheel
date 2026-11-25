// The rules for copies on this Mac (SPEC §7), as one pure function: given
// a video and the world around it, what should happen to it next?
// Everything that moves or deletes a file asks this first.

use super::model::{Mode, Problem, Video};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Conditions {
    pub mode: Mode,
    pub now: u64,
    pub online: bool,
    pub signed_in: bool,
    pub cloud_full: bool,
    // Playing or being transcribed right now (rule 3).
    pub in_use: bool,
    // There's room on this Mac to bring it home (rule 5).
    pub room_ok: bool,
    // Bringing everything home before disconnecting: nothing goes up or
    // leaves this Mac meanwhile (SPEC 5.7).
    pub disconnecting: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    DeleteInCloud,
    Check,
    Upload,
    Download,
    Offload,
    Wait,
}

// Does this mode want the video on this Mac right now?
pub fn wants_on_mac(video: &Video, mode: Mode, now: u64) -> bool {
    match mode {
        Mode::Backup => true,
        Mode::AlwaysInCloud => false,
        Mode::Smart => now < video.smart_keep_until(),
    }
}

pub fn next_step(video: &Video, c: &Conditions) -> Step {
    if !c.online || !c.signed_in {
        // Rules 2 and 4: nothing moves, nothing leaves.
        return Step::Wait;
    }
    if video.removed {
        return Step::DeleteInCloud;
    }
    if video.awaiting_check.is_some() {
        return Step::Check;
    }
    let wants = c.disconnecting || wants_on_mac(video, c.mode, c.now);
    match (video.on_mac, video.is_safe()) {
        _ if c.disconnecting && video.on_mac => Step::Wait,
        (true, false) if video.problem != Some(Problem::Unreadable) && !c.cloud_full => Step::Upload,
        (true, true) if !wants && !c.in_use => Step::Offload,
        (false, true) if wants && c.room_ok && video.problem != Some(Problem::Missing) => Step::Download,
        _ => Step::Wait,
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::storage::model::{Receipt, SMART_WINDOW_SECONDS};

    pub const DAY: u64 = 24 * 60 * 60;

    pub fn video(on_mac: bool, safe: bool) -> Video {
        Video {
            space_id: "s1".into(),
            space_folder: "Acme".into(),
            record_id: "r1".into(),
            file_name: "hero.mp4".into(),
            size: 10,
            added_at: 1_000 * DAY,
            last_watched_at: None,
            on_mac,
            upload: None,
            awaiting_check: None,
            receipt: safe.then(|| Receipt { item_id: "i1".into(), size: 10, web_url: "https://x".into() }),
            problem: None,
            removed: false,
        }
    }

    fn online(mode: Mode, now: u64) -> Conditions {
        Conditions {
            mode,
            now,
            online: true,
            signed_in: true,
            cloud_full: false,
            in_use: false,
            room_ok: true,
            disconnecting: false,
        }
    }

    #[test]
    fn disconnecting_only_brings_videos_home() {
        let mut c = online(Mode::AlwaysInCloud, 1_000 * DAY);
        c.disconnecting = true;
        assert_eq!(next_step(&video(false, true), &c), Step::Download);
        assert_eq!(next_step(&video(true, false), &c), Step::Wait);
        assert_eq!(next_step(&video(true, true), &c), Step::Wait);
        c.room_ok = false;
        assert_eq!(next_step(&video(false, true), &c), Step::Wait);
    }

    #[test]
    fn unsafe_videos_upload_and_never_offload_in_any_mode() {
        let late = 2_000 * DAY;
        for mode in [Mode::Backup, Mode::Smart, Mode::AlwaysInCloud] {
            assert_eq!(next_step(&video(true, false), &online(mode, late)), Step::Upload);
        }
    }

    #[test]
    fn backup_keeps_safe_videos_and_brings_cloud_ones_home() {
        let c = online(Mode::Backup, 2_000 * DAY);
        assert_eq!(next_step(&video(true, true), &c), Step::Wait);
        assert_eq!(next_step(&video(false, true), &c), Step::Download);
    }

    #[test]
    fn always_in_cloud_offloads_safe_videos_unless_in_use() {
        let mut c = online(Mode::AlwaysInCloud, 1_000 * DAY);
        assert_eq!(next_step(&video(true, true), &c), Step::Offload);
        assert_eq!(next_step(&video(false, true), &c), Step::Wait);
        c.in_use = true;
        assert_eq!(next_step(&video(true, true), &c), Step::Wait);
    }

    #[test]
    fn smart_keeps_fourteen_days_from_added_or_watched() {
        let mut v = video(true, true);
        let added = v.added_at;
        assert_eq!(next_step(&v, &online(Mode::Smart, added + SMART_WINDOW_SECONDS - 1)), Step::Wait);
        assert_eq!(next_step(&v, &online(Mode::Smart, added + SMART_WINDOW_SECONDS)), Step::Offload);
        v.last_watched_at = Some(added + 10 * DAY);
        assert_eq!(next_step(&v, &online(Mode::Smart, added + 20 * DAY)), Step::Wait);
        assert_eq!(next_step(&v, &online(Mode::Smart, added + 24 * DAY)), Step::Offload);
    }

    #[test]
    fn smart_brings_recent_cloud_videos_home_only_with_room() {
        let mut v = video(false, true);
        v.last_watched_at = Some(v.added_at + 30 * DAY);
        let mut c = online(Mode::Smart, v.added_at + 31 * DAY);
        assert_eq!(next_step(&v, &c), Step::Download);
        c.room_ok = false;
        assert_eq!(next_step(&v, &c), Step::Wait);
    }

    #[test]
    fn offline_or_signed_out_nothing_moves() {
        let mut c = online(Mode::AlwaysInCloud, 1_000 * DAY);
        c.online = false;
        assert_eq!(next_step(&video(true, true), &c), Step::Wait);
        assert_eq!(next_step(&video(true, false), &c), Step::Wait);
        c.online = true;
        c.signed_in = false;
        assert_eq!(next_step(&video(true, true), &c), Step::Wait);
    }

    #[test]
    fn full_cloud_and_unreadable_files_stay_put() {
        let mut c = online(Mode::AlwaysInCloud, 1_000 * DAY);
        c.cloud_full = true;
        assert_eq!(next_step(&video(true, false), &c), Step::Wait);
        c.cloud_full = false;
        let mut v = video(true, false);
        v.problem = Some(Problem::Unreadable);
        assert_eq!(next_step(&v, &c), Step::Wait);
    }

    #[test]
    fn removed_and_finished_uploads_come_first() {
        let c = online(Mode::Backup, 1_000 * DAY);
        let mut v = video(true, false);
        v.awaiting_check = Some("i1".into());
        assert_eq!(next_step(&v, &c), Step::Check);
        v.removed = true;
        assert_eq!(next_step(&v, &c), Step::DeleteInCloud);
    }

    #[test]
    fn missing_cloud_videos_are_not_downloaded() {
        let mut v = video(false, true);
        v.problem = Some(Problem::Missing);
        assert_eq!(next_step(&v, &online(Mode::Backup, 1_000 * DAY)), Step::Wait);
    }
}
