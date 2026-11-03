// Spaces: where every Space's Agents/chats/Performance Review records live
// on disk, and the one-time migration that adopts pre-existing data (from
// before this feature existed) into a "Default" Space.
//
//   ~/Documents/Master's Wheel/spaces.json          <- registry (TS-owned)
//   ~/Documents/Master's Wheel/<folderName>/agents/...
//   ~/Documents/Master's Wheel/<folderName>/chats/...
//   ~/Documents/Master's Wheel/<folderName>/records/...
//
// Ongoing registry reads/writes stay plain TS (src/lib/spaces/registry.ts),
// matching every other storage module in this app. The migration itself is
// a Rust command instead, for one reason: it has to move
// `<app data>/agents` and `<app data>/chats` into ~/Documents, which is
// outside any fs capability this app's webview is scoped to — rather than
// widening that scope just for one first-run move, Rust just does it
// directly (capabilities only gate the webview's plugin-fs calls, not
// Rust's own `std::fs`).

use std::io;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

use crate::media_server::MediaServerHandle;

const STORAGE_DIR_NAME: &str = "Master's Wheel";
const REGISTRY_FILE_NAME: &str = "spaces.json";
const DEFAULT_FOLDER_NAME: &str = "Default";

fn wheel_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .document_dir()
        .map(|dir| dir.join(STORAGE_DIR_NAME))
        .map_err(|e| format!("Couldn't resolve the Documents directory: {e}"))
}

pub fn space_dir(app: &AppHandle, space_folder: &str) -> Result<PathBuf, String> {
    Ok(wheel_root(app)?.join(space_folder))
}

pub fn agents_dir(app: &AppHandle, space_folder: &str) -> Result<PathBuf, String> {
    Ok(space_dir(app, space_folder)?.join("agents"))
}

pub fn records_dir(app: &AppHandle, space_folder: &str) -> Result<PathBuf, String> {
    Ok(space_dir(app, space_folder)?.join("records"))
}

// Renames when possible (an O(1) metadata operation on the same volume,
// not a byte-copy — safe even for large video files); falls back to a
// recursive copy + delete-source only on a genuine cross-device move
// (`EXDEV`), which a same-machine Documents/app-data move should never
// actually hit, but is handled rather than assumed away.
fn rename_or_copy(src: &Path, dst: &Path) -> io::Result<()> {
    match std::fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(e) if e.raw_os_error() == Some(libc_exdev()) => {
            copy_dir_recursive(src, dst)?;
            std::fs::remove_dir_all(src)
        }
        Err(e) => Err(e),
    }
}

// 18 is EXDEV on macOS/Linux — hardcoded rather than pulling in the `libc`
// crate for one constant this app (macOS-only today) is unlikely to ever
// actually hit.
fn libc_exdev() -> i32 {
    18
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let dst_path = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &dst_path)?;
        } else {
            std::fs::copy(entry.path(), &dst_path)?;
        }
    }
    Ok(())
}

// Idempotent: a no-op once spaces.json exists. Safe to call on every
// launch, and safe to retry after a crash mid-migration — every step below
// either already exists (skipped) or gets created fresh, and the registry
// itself is only ever written last, once every move has actually
// succeeded. `created_at` comes from the frontend (a plain ISO timestamp)
// rather than computed here, so this file doesn't need a date/time crate
// for the one string it would otherwise need to format.
#[tauri::command]
pub fn migrate_legacy_data_to_default_space(app: AppHandle, created_at: String) -> Result<(), String> {
    let wheel_root = wheel_root(&app)?;
    let registry_path = wheel_root.join(REGISTRY_FILE_NAME);
    if registry_path.exists() {
        return Ok(());
    }

    std::fs::create_dir_all(&wheel_root).map_err(|e| format!("Couldn't create {}: {e}", wheel_root.display()))?;

    let default_dir = wheel_root.join(DEFAULT_FOLDER_NAME);
    std::fs::create_dir_all(&default_dir).map_err(|e| format!("Couldn't create the Default Space folder: {e}"))?;

    let default_records = default_dir.join("records");
    std::fs::create_dir_all(&default_records).map_err(|e| format!("Couldn't create Default's records folder: {e}"))?;

    // Everything that was sitting directly under the storage root before
    // Spaces existed is a pre-existing Performance Review record folder —
    // adopt it into Default/records, skipping the two names this
    // migration itself just created/is about to create.
    let entries = std::fs::read_dir(&wheel_root).map_err(|e| format!("Couldn't read {}: {e}", wheel_root.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name();
        if name == DEFAULT_FOLDER_NAME || name == REGISTRY_FILE_NAME {
            continue;
        }
        let dst = default_records.join(&name);
        rename_or_copy(&entry.path(), &dst).map_err(|e| format!("Couldn't move {} into Default/records: {e}", name.to_string_lossy()))?;
    }

    let default_agents = default_dir.join("agents");
    if !default_agents.exists() {
        let app_data_dir = app.path().app_data_dir().map_err(|e| format!("Couldn't resolve the app data directory: {e}"))?;
        let legacy_agents = app_data_dir.join("agents");
        if legacy_agents.exists() {
            rename_or_copy(&legacy_agents, &default_agents).map_err(|e| format!("Couldn't move existing agents into the Default Space: {e}"))?;
        } else {
            std::fs::create_dir_all(&default_agents).map_err(|e| format!("Couldn't create Default's agents folder: {e}"))?;
        }
    }

    let default_chats = default_dir.join("chats");
    if !default_chats.exists() {
        let app_data_dir = app.path().app_data_dir().map_err(|e| format!("Couldn't resolve the app data directory: {e}"))?;
        let legacy_chats = app_data_dir.join("chats");
        if legacy_chats.exists() {
            rename_or_copy(&legacy_chats, &default_chats).map_err(|e| format!("Couldn't move existing chats into the Default Space: {e}"))?;
        } else {
            std::fs::create_dir_all(&default_chats).map_err(|e| format!("Couldn't create Default's chats folder: {e}"))?;
        }
    }

    // icon: "" rather than a hardcoded id — the frontend's icon picker
    // (Phase 4) treats an unrecognized/empty icon id as "render the
    // fallback", same defensive-parsing convention every other
    // missing-or-corrupt field in this app already follows, so this one
    // literal doesn't need to be kept in sync with the TS icon registry.
    let registry = serde_json::json!({
        "spaces": [{
            "id": "default",
            "name": DEFAULT_FOLDER_NAME,
            "icon": "",
            "createdAt": created_at,
            "folderName": DEFAULT_FOLDER_NAME,
        }],
        "activeSpaceId": "default",
    });
    std::fs::write(&registry_path, serde_json::to_vec_pretty(&registry).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Couldn't write spaces.json: {e}"))
}

// Called by the frontend (src/lib/spaces/context.tsx) every time the
// active Space changes, so the already-running media server starts
// serving the newly active Space's videos instead of the previous one's.
#[tauri::command]
pub fn switch_space_media_root(app: AppHandle, media: tauri::State<'_, MediaServerHandle>, space_folder: String) -> Result<(), String> {
    media.set_root(records_dir(&app, &space_folder)?);
    Ok(())
}

// rename_or_copy/copy_dir_recursive are the actual risky part of this
// whole feature — real user data (Agents, chats, Performance Review
// records, potentially large videos) moves through them exactly once,
// with no undo. migrate_legacy_data_to_default_space itself needs a real
// AppHandle to test meaningfully (not worth mocking just for this), but
// these two don't — covering them directly is what matters.
#[cfg(test)]
mod tests {
    use super::*;

    fn unique_temp_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("masters-wheel-spaces-test-{label}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create temp test dir");
        dir
    }

    #[test]
    fn rename_or_copy_moves_a_nested_tree_and_removes_the_source() {
        let base = unique_temp_dir("rename-basic");
        let src = base.join("src");
        let dst = base.join("dst");
        std::fs::create_dir_all(src.join("sub")).unwrap();
        std::fs::write(src.join("top.txt"), b"top").unwrap();
        std::fs::write(src.join("sub").join("nested.txt"), b"nested").unwrap();

        rename_or_copy(&src, &dst).expect("rename_or_copy should succeed");

        assert!(!src.exists(), "source should be gone after a successful move");
        assert_eq!(std::fs::read(dst.join("top.txt")).unwrap(), b"top");
        assert_eq!(std::fs::read(dst.join("sub").join("nested.txt")).unwrap(), b"nested");

        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn copy_dir_recursive_preserves_every_nested_file_and_keeps_the_source() {
        let base = unique_temp_dir("copy-recursive");
        let src = base.join("src");
        let dst = base.join("dst");
        std::fs::create_dir_all(src.join("a").join("b")).unwrap();
        std::fs::write(src.join("root.txt"), b"root").unwrap();
        std::fs::write(src.join("a").join("mid.txt"), b"mid").unwrap();
        std::fs::write(src.join("a").join("b").join("deep.txt"), b"deep").unwrap();

        copy_dir_recursive(&src, &dst).expect("copy_dir_recursive should succeed");

        // Unlike rename_or_copy, this helper alone never deletes the
        // source — that's the caller's job, only after a successful copy.
        assert!(src.exists());
        assert_eq!(std::fs::read(dst.join("root.txt")).unwrap(), b"root");
        assert_eq!(std::fs::read(dst.join("a").join("mid.txt")).unwrap(), b"mid");
        assert_eq!(std::fs::read(dst.join("a").join("b").join("deep.txt")).unwrap(), b"deep");

        let _ = std::fs::remove_dir_all(&base);
    }
}
