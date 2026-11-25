// Finds the record videos on this Mac: every Space in
// <wheel_root>/spaces.json, every records/<id>/hero.<ext> in it.

use std::path::Path;
use std::time::UNIX_EPOCH;

use serde::Deserialize;

#[derive(Debug, Clone, PartialEq)]
pub struct Found {
    pub space_id: String,
    pub space_folder: String,
    pub record_id: String,
    pub file_name: String,
    pub size: u64,
    // The file's modification time, as the "added" moment for new entries.
    pub modified_at: u64,
}

#[derive(Deserialize)]
struct Registry {
    spaces: Vec<SpaceEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpaceEntry {
    id: String,
    folder_name: String,
}

pub fn scan(wheel_root: &Path) -> Result<Vec<Found>, String> {
    let registry_path = wheel_root.join("spaces.json");
    let text = match std::fs::read_to_string(&registry_path) {
        Ok(text) => text,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(format!("reading {}: {e}", registry_path.display())),
    };
    let registry: Registry =
        serde_json::from_str(&text).map_err(|e| format!("parsing {}: {e}", registry_path.display()))?;
    let mut found = Vec::new();
    for space in registry.spaces {
        let records = wheel_root.join(&space.folder_name).join("records");
        let Ok(entries) = std::fs::read_dir(&records) else { continue };
        for entry in entries.flatten() {
            let record_id = entry.file_name().to_string_lossy().into_owned();
            if record_id.starts_with('.') {
                continue;
            }
            if let Some((file_name, size, modified_at)) = hero_in(&entry.path()) {
                found.push(Found {
                    space_id: space.id.clone(),
                    space_folder: space.folder_name.clone(),
                    record_id,
                    file_name,
                    size,
                    modified_at,
                });
            }
        }
    }
    Ok(found)
}

pub fn is_hero_name(name: &str) -> bool {
    name.starts_with("hero.") && !name.ends_with(".webloc")
}

fn hero_in(record_dir: &Path) -> Option<(String, u64, u64)> {
    std::fs::read_dir(record_dir).ok()?.flatten().find_map(|entry| {
        let name = entry.file_name().to_string_lossy().into_owned();
        let meta = entry.metadata().ok()?;
        if !is_hero_name(&name) || !meta.is_file() {
            return None;
        }
        let modified_at = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs();
        Some((name, meta.len(), modified_at))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::testdir::TestDir;

    #[test]
    fn finds_hero_videos_in_every_space_and_skips_the_rest() {
        let root = TestDir::new("scan");
        root.write("spaces.json", r#"{"spaces":[{"id":"s1","folderName":"Acme"},{"id":"s2","folderName":"Home"}],"activeSpaceId":"s1"}"#);
        root.write("Acme/records/r1/hero.mp4", "12345");
        root.write("Acme/records/r1/notes.json", "{}");
        root.write("Acme/records/r2/Video is in OneDrive.webloc", "x");
        root.write("Acme/records/r3/.hero-download.part", "x");
        root.write("Home/records/r9/hero.mov", "1");

        let mut found = scan(root.path()).unwrap();
        found.sort_by(|a, b| a.record_id.cmp(&b.record_id));
        let names: Vec<_> = found.iter().map(|f| (f.space_id.as_str(), f.record_id.as_str(), f.file_name.as_str(), f.size)).collect();
        assert_eq!(names, vec![("s1", "r1", "hero.mp4", 5), ("s2", "r9", "hero.mov", 1)]);
    }

    #[test]
    fn no_registry_means_no_videos() {
        assert!(scan(TestDir::new("scan-empty").path()).unwrap().is_empty());
    }
}
