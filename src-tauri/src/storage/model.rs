// What the engine knows about each record video. Persisted in the ledger
// (ledger.rs), so uploads resume and copies stay accounted for across
// restarts.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    // Every video stays on this Mac, and a copy is kept in OneDrive.
    #[default]
    Backup,
    // Videos added or watched in the last 14 days stay on this Mac.
    Smart,
    // Videos live in OneDrive; this Mac keeps one only until it's safe.
    AlwaysInCloud,
}

// OneDrive's confirmation that it holds the whole file. A copy on this
// Mac may only be removed while one of these exists.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub item_id: String,
    pub size: u64,
    pub web_url: String,
}

// A half-done resumable upload. The URL is Microsoft's pre-authenticated
// session URL; it outlives app restarts (for days).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadSession {
    pub url: String,
    pub next_offset: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Problem {
    // The file on this Mac couldn't be read; waits for "Try again".
    Unreadable,
    // Only in OneDrive, and OneDrive no longer has it.
    Missing,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Video {
    // Spaces can be renamed (their folder moves), so the id is the key.
    pub space_id: String,
    pub space_folder: String,
    pub record_id: String,
    // e.g. "hero.mp4"
    pub file_name: String,
    pub size: u64,
    // Unix seconds.
    pub added_at: u64,
    pub last_watched_at: Option<u64>,
    pub on_mac: bool,
    pub upload: Option<UploadSession>,
    // The upload finished; OneDrive's copy still has to be checked.
    pub awaiting_check: Option<String>,
    pub receipt: Option<Receipt>,
    pub problem: Option<Problem>,
    // Removed in the app; the OneDrive copy still has to be deleted.
    pub removed: bool,
}

pub const WEBLOC_NAME: &str = "Video is in OneDrive.webloc";
// Dot-prefixed and not "hero.*", so nothing mistakes it for the video.
pub const DOWNLOAD_PART_NAME: &str = ".hero-download.part";

pub fn video_key(space_id: &str, record_id: &str) -> String {
    format!("{space_id}/{record_id}")
}

impl Video {
    pub fn key(&self) -> String {
        video_key(&self.space_id, &self.record_id)
    }

    pub fn record_dir(&self, wheel_root: &Path) -> PathBuf {
        wheel_root.join(&self.space_folder).join("records").join(&self.record_id)
    }

    pub fn local_path(&self, wheel_root: &Path) -> PathBuf {
        self.record_dir(wheel_root).join(&self.file_name)
    }

    // When the 14 days of Smart run out.
    pub fn smart_keep_until(&self) -> u64 {
        self.added_at.max(self.last_watched_at.unwrap_or(0)) + SMART_WINDOW_SECONDS
    }

    pub fn is_safe(&self) -> bool {
        self.receipt.is_some()
    }
}

pub const SMART_WINDOW_SECONDS: u64 = 14 * 24 * 60 * 60;
