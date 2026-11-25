// Carries out one planned step against OneDrive, without touching the
// ledger: the slow part runs outside the engine's lock, and the engine
// applies the Outcome (engine.rs finish) once it's back.

use std::path::{Path, PathBuf};

use crate::onedrive::drive::{ChunkReply, DriveItem};

use super::cloud::{Cloud, CloudError, CloudResult};
use super::layout::{cloud_path, month_folder};
use super::local;
use super::model::{DOWNLOAD_PART_NAME, Receipt, UploadSession, Video};
use super::policy::Step;

// 32 × 320 KiB: OneDrive wants chunks in multiples of 320 KiB.
pub const CHUNK_SIZE: u64 = 32 * 320 * 1024;

#[derive(Debug, Clone)]
pub struct Job {
    pub key: String,
    pub step: Step,
    pub video: Video,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Outcome {
    SessionStarted(String),
    Sent { url: String, next: u64 },
    // OneDrive built the file (or already had it); it still gets checked.
    Uploaded(DriveItem),
    SessionLost,
    Confirmed(Receipt),
    // OneDrive's copy isn't the whole file (or is gone): upload again.
    CheckFailed,
    // OneDrive's copy was just re-checked; the local one may go.
    OffloadReady,
    // The .part file holds the whole video.
    Downloaded,
    Deleted,
    Unreadable(String),
    Failed(CloudError),
}

pub struct Context {
    pub wheel_root: PathBuf,
    pub scratch: PathBuf,
    pub chunk_size: u64,
}

pub fn perform(job: &Job, cloud: &dyn Cloud, ctx: &Context) -> Outcome {
    let v = &job.video;
    let result = match job.step {
        Step::Upload => upload(v, cloud, ctx),
        Step::Check => check(v, cloud),
        Step::Offload => verify_cloud_copy(v, cloud),
        Step::Download => download(v, cloud, ctx),
        Step::DeleteInCloud => delete(v, cloud),
        Step::Wait => return Outcome::Failed(CloudError::Transient("nothing to do".into())),
    };
    result.unwrap_or_else(Outcome::Failed)
}

pub fn part_path(video: &Video, wheel_root: &Path) -> PathBuf {
    video.record_dir(wheel_root).join(DOWNLOAD_PART_NAME)
}

fn upload(v: &Video, cloud: &dyn Cloud, ctx: &Context) -> CloudResult<Outcome> {
    if v.size == 0 {
        return Ok(Outcome::Unreadable("the file is empty".into()));
    }
    let Some(session) = &v.upload else {
        let path = cloud_path(v);
        cloud.ensure_folder(&month_folder(v))?;
        if let Some(item) = cloud.find(&path)? {
            if item.size == v.size {
                return Ok(Outcome::Uploaded(item));
            }
        }
        return Ok(Outcome::SessionStarted(cloud.start_upload(&path)?));
    };
    send_chunk(v, session, cloud, ctx)
}

fn send_chunk(v: &Video, session: &UploadSession, cloud: &dyn Cloud, ctx: &Context) -> CloudResult<Outcome> {
    let start = session.next_offset;
    let len = ctx.chunk_size.min(v.size.saturating_sub(start));
    std::fs::create_dir_all(&ctx.scratch).map_err(|e| CloudError::Transient(format!("scratch folder: {e}")))?;
    let chunk = ctx.scratch.join(format!("{}-{}.chunk", v.space_id, v.record_id));
    if let Err(e) = local::write_chunk(&v.local_path(&ctx.wheel_root), start, len, &chunk) {
        return Ok(Outcome::Unreadable(e.to_string()));
    }
    let reply = cloud.upload_chunk(&session.url, &chunk, start, len, v.size);
    let _ = std::fs::remove_file(&chunk);
    let url = session.url.clone();
    match reply {
        Ok(ChunkReply::Next(next)) => Ok(Outcome::Sent { url, next }),
        Ok(ChunkReply::Done(item)) => Ok(Outcome::Uploaded(item)),
        Err(CloudError::RangeMismatch) => match cloud.upload_status(&url) {
            Ok(next) => Ok(Outcome::Sent { url, next }),
            Err(CloudError::NotFound) => Ok(Outcome::SessionLost),
            Err(e) => Err(e),
        },
        Err(CloudError::NotFound) => Ok(Outcome::SessionLost),
        Err(e) => Err(e),
    }
}

fn check(v: &Video, cloud: &dyn Cloud) -> CloudResult<Outcome> {
    let id = v.awaiting_check.as_deref().unwrap_or_default();
    Ok(match cloud.item(id)? {
        Some(item) if item.size == v.size => {
            Outcome::Confirmed(Receipt { item_id: item.id, size: item.size, web_url: item.web_url })
        }
        _ => Outcome::CheckFailed,
    })
}

// Rule 1, checked fresh right before a local copy goes.
fn verify_cloud_copy(v: &Video, cloud: &dyn Cloud) -> CloudResult<Outcome> {
    let Some(receipt) = &v.receipt else { return Ok(Outcome::CheckFailed) };
    Ok(match cloud.item(&receipt.item_id)? {
        Some(item) if item.size == receipt.size && receipt.size == v.size => Outcome::OffloadReady,
        _ => Outcome::CheckFailed,
    })
}

fn download(v: &Video, cloud: &dyn Cloud, ctx: &Context) -> CloudResult<Outcome> {
    let Some(receipt) = &v.receipt else { return Ok(Outcome::CheckFailed) };
    let part = part_path(v, &ctx.wheel_root);
    std::fs::create_dir_all(v.record_dir(&ctx.wheel_root)).map_err(|e| CloudError::Transient(format!("record folder: {e}")))?;
    if local::file_size(&part).is_some_and(|size| size > receipt.size) {
        let _ = std::fs::remove_file(&part);
    }
    cloud.download(&receipt.item_id, &part)?;
    if local::file_size(&part) == Some(receipt.size) {
        return Ok(Outcome::Downloaded);
    }
    let _ = std::fs::remove_file(&part);
    Err(CloudError::Transient("downloaded size doesn't match OneDrive's".into()))
}

fn delete(v: &Video, cloud: &dyn Cloud) -> CloudResult<Outcome> {
    let ids = v.receipt.iter().map(|r| r.item_id.as_str()).chain(v.awaiting_check.as_deref());
    for id in ids {
        match cloud.delete(id) {
            Ok(()) | Err(CloudError::NotFound) => {}
            Err(e) => return Err(e),
        }
    }
    Ok(Outcome::Deleted)
}
