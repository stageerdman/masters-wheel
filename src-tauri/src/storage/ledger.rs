// The engine's memory: the chosen mode, the account the receipts belong
// to, and every video it knows. Saved atomically after each change.

use std::collections::BTreeMap;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::model::{Mode, Video, video_key};
use super::scan::Found;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ledger {
    pub mode: Mode,
    pub account: Option<String>,
    pub videos: BTreeMap<String, Video>,
}

impl Ledger {
    pub fn load(path: &Path) -> Result<Self, String> {
        match std::fs::read_to_string(path) {
            Ok(text) => serde_json::from_str(&text).map_err(|e| format!("parsing {}: {e}", path.display())),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Self::default()),
            Err(e) => Err(format!("reading {}: {e}", path.display())),
        }
    }

    // Write-then-rename, so a crash never leaves half a ledger.
    pub fn save(&self, path: &Path) -> Result<(), String> {
        let text = serde_json::to_string_pretty(self).map_err(|e| format!("serializing the ledger: {e}"))?;
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("creating {}: {e}", dir.display()))?;
        }
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, text).map_err(|e| format!("writing {}: {e}", tmp.display()))?;
        std::fs::rename(&tmp, path).map_err(|e| format!("saving {}: {e}", path.display()))
    }

    // Brings the ledger in line with what's on disk right now.
    pub fn reconcile(&mut self, found: &[Found]) {
        let mut seen = std::collections::HashSet::new();
        for f in found {
            let key = video_key(&f.space_id, &f.record_id);
            seen.insert(key.clone());
            match self.videos.get_mut(&key) {
                Some(video) => refresh(video, f),
                None => {
                    self.videos.insert(key, new_video(f));
                }
            }
        }
        self.videos.retain(|key, video| {
            if seen.contains(key) || !video.on_mac || video.removed {
                return true;
            }
            // Gone from this Mac outside the engine: if OneDrive has it, it's
            // now a cloud video; if not, there's nothing left to track.
            video.on_mac = false;
            video.upload = None;
            video.is_safe()
        });
    }
}

fn new_video(f: &Found) -> Video {
    Video {
        space_id: f.space_id.clone(),
        space_folder: f.space_folder.clone(),
        record_id: f.record_id.clone(),
        file_name: f.file_name.clone(),
        size: f.size,
        added_at: f.modified_at,
        last_watched_at: None,
        on_mac: true,
        upload: None,
        awaiting_check: None,
        receipt: None,
        problem: None,
        removed: false,
    }
}

fn refresh(video: &mut Video, f: &Found) {
    video.space_folder = f.space_folder.clone();
    video.on_mac = true;
    if video.size != f.size || video.file_name != f.file_name {
        // A different file now: the old receipt doesn't vouch for it.
        video.file_name = f.file_name.clone();
        video.size = f.size;
        video.upload = None;
        video.awaiting_check = None;
        video.receipt = None;
        video.problem = None;
    } else if video.problem == Some(super::model::Problem::Missing) {
        video.problem = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::model::Receipt;
    use crate::storage::testdir::TestDir;

    fn found(record: &str, size: u64) -> Found {
        Found {
            space_id: "s1".into(),
            space_folder: "Acme".into(),
            record_id: record.into(),
            file_name: "hero.mp4".into(),
            size,
            modified_at: 100,
        }
    }

    fn receipt(size: u64) -> Receipt {
        Receipt { item_id: "i".into(), size, web_url: "https://x".into() }
    }

    #[test]
    fn new_files_become_videos_on_this_mac() {
        let mut ledger = Ledger::default();
        ledger.reconcile(&[found("r1", 5)]);
        let video = &ledger.videos["s1/r1"];
        assert!(video.on_mac && !video.is_safe());
        assert_eq!(video.added_at, 100);
    }

    #[test]
    fn vanished_files_stay_tracked_only_if_onedrive_has_them() {
        let mut ledger = Ledger::default();
        ledger.reconcile(&[found("r1", 5), found("r2", 5)]);
        ledger.videos.get_mut("s1/r1").unwrap().receipt = Some(receipt(5));
        ledger.reconcile(&[]);
        assert!(!ledger.videos["s1/r1"].on_mac);
        assert!(!ledger.videos.contains_key("s1/r2"));
    }

    #[test]
    fn a_changed_file_loses_its_receipt() {
        let mut ledger = Ledger::default();
        ledger.reconcile(&[found("r1", 5)]);
        ledger.videos.get_mut("s1/r1").unwrap().receipt = Some(receipt(5));
        ledger.reconcile(&[found("r1", 6)]);
        assert!(!ledger.videos["s1/r1"].is_safe());
    }

    #[test]
    fn saves_and_loads_atomically() {
        let dir = TestDir::new("ledger");
        let path = dir.path().join("onedrive/videos.json");
        let mut ledger = Ledger { mode: Mode::Smart, account: Some("a@b".into()), ..Default::default() };
        ledger.reconcile(&[found("r1", 5)]);
        ledger.save(&path).unwrap();
        assert_eq!(Ledger::load(&path).unwrap(), ledger);
        assert_eq!(Ledger::load(&dir.path().join("none.json")).unwrap(), Ledger::default());
    }
}
