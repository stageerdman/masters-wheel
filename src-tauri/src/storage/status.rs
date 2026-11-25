// What the UI shows: each video's state (SPEC 6.1), the account's health,
// and what a mode switch would move (SPEC 5.5). Pure reads of the engine.

use serde::Serialize;

use super::engine::Engine;
use super::model::{Mode, Problem, Video};
use super::policy::wants_on_mac;
use super::room::DiskSpace;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VideoState {
    Waiting,
    Uploading,
    Checking,
    Paused,
    SafeOnMac,
    InCloud,
    NotUploadedFull,
    NotUploadedUnreadable,
    Missing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoStatus {
    pub space_id: String,
    pub record_id: String,
    // e.g. "hero.mp4": lets the UI build the player URL for a cloud-only video.
    pub file_name: String,
    pub state: VideoState,
    pub percent: u8,
    pub size: u64,
    // Smart only: when it leaves this Mac (Unix seconds).
    pub keep_until: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub mode: Mode,
    // Connected on purpose; with `signed_in` false that means signed out.
    pub connected: bool,
    pub account: Option<String>,
    pub disconnecting: bool,
    pub online: bool,
    pub signed_in: bool,
    pub revoked: bool,
    pub cloud_full: bool,
    pub upload_bytes_left: u64,
    // What the current mode (or a running disconnect) still has to move.
    pub pending: SwitchPreview,
    pub videos: Vec<VideoStatus>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SwitchPreview {
    pub to_cloud: u32,
    pub to_cloud_bytes: u64,
    pub to_mac: u32,
    pub to_mac_bytes: u64,
    pub free_bytes: u64,
    pub enough_room: bool,
    // When there isn't enough room: how much to free up first.
    pub short_bytes: u64,
}

pub fn overview(engine: &Engine, now: u64) -> Overview {
    let videos: Vec<VideoStatus> =
        engine.ledger.videos.values().filter(|v| !v.removed).map(|v| video_status(engine, v, now)).collect();
    let upload_bytes_left = engine
        .ledger
        .videos
        .values()
        .filter(|v| v.on_mac && !v.is_safe() && v.problem.is_none())
        .map(|v| v.size - v.upload.as_ref().map_or(0, |s| s.next_offset.min(v.size)))
        .sum();
    let ledger = &engine.ledger;
    let moving_to = if ledger.disconnecting { Mode::Backup } else { ledger.mode };
    Overview {
        mode: ledger.mode,
        connected: ledger.connected,
        account: ledger.account.clone(),
        disconnecting: ledger.disconnecting,
        online: engine.online(now),
        signed_in: engine.health.signed_in,
        revoked: engine.health.revoked,
        cloud_full: engine.cloud_full(now),
        upload_bytes_left,
        pending: preview_switch(engine, moving_to, now, None),
        videos,
    }
}

// Rule 6: a switch that downloads checks for room before it starts. A
// disconnect previews as a switch to Backup: everything comes home.
pub fn preview_switch(engine: &Engine, mode: Mode, now: u64, disk: Option<DiskSpace>) -> SwitchPreview {
    let mut preview = SwitchPreview {
        to_cloud: 0,
        to_cloud_bytes: 0,
        to_mac: 0,
        to_mac_bytes: 0,
        free_bytes: disk.map_or(0, |d| d.free),
        enough_room: true,
        short_bytes: 0,
    };
    for v in engine.ledger.videos.values().filter(|v| !v.removed) {
        let wants = wants_on_mac(v, mode, now);
        if v.on_mac && !wants {
            preview.to_cloud += 1;
            preview.to_cloud_bytes += v.size;
        } else if !v.on_mac && wants && v.problem != Some(Problem::Missing) {
            preview.to_mac += 1;
            preview.to_mac_bytes += v.size;
        }
    }
    if preview.to_mac > 0 {
        preview.enough_room = disk.is_some_and(|d| d.has_room_for(preview.to_mac_bytes, mode));
        preview.short_bytes = disk.map_or(0, |d| d.shortfall(preview.to_mac_bytes, mode));
    }
    preview
}

fn video_status(engine: &Engine, v: &Video, now: u64) -> VideoStatus {
    let active = engine.online(now) && engine.health.signed_in && !engine.health.revoked;
    let percent = match (&v.upload, v.size) {
        (Some(s), size) if size > 0 => (s.next_offset.min(size) * 100 / size) as u8,
        _ => 0,
    };
    let state = if v.problem == Some(Problem::Missing) && !v.on_mac {
        VideoState::Missing
    } else if v.is_safe() {
        if v.on_mac { VideoState::SafeOnMac } else { VideoState::InCloud }
    } else if v.problem == Some(Problem::Unreadable) {
        VideoState::NotUploadedUnreadable
    } else if v.awaiting_check.is_some() {
        VideoState::Checking
    } else if engine.cloud_full(now) {
        VideoState::NotUploadedFull
    } else if !active {
        VideoState::Paused
    } else if v.upload.is_some() {
        VideoState::Uploading
    } else {
        VideoState::Waiting
    };
    let keep_until = (engine.ledger.mode == Mode::Smart && v.on_mac).then(|| v.smart_keep_until());
    VideoStatus {
        space_id: v.space_id.clone(),
        record_id: v.record_id.clone(),
        file_name: v.file_name.clone(),
        state,
        percent,
        size: v.size,
        keep_until,
    }
}
