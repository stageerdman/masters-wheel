// An in-memory OneDrive for engine tests: items by id, resumable upload
// sessions, and a switch to make every call fail a given way.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

use crate::onedrive::drive::{ChunkReply, DriveItem};

use super::cloud::{Cloud, CloudError, CloudResult};

#[derive(Default)]
struct State {
    items: HashMap<String, (String, Vec<u8>)>,
    sessions: HashMap<String, (String, Vec<u8>)>,
    sessions_started: u32,
    next_id: u32,
    failure: Option<CloudError>,
}

#[derive(Default)]
pub struct FakeCloud(Mutex<State>);

impl FakeCloud {
    pub fn fail_with(&self, failure: Option<CloudError>) {
        self.0.lock().unwrap().failure = failure;
    }

    pub fn bytes(&self, id: &str) -> Option<Vec<u8>> {
        self.0.lock().unwrap().items.get(id).map(|(_, bytes)| bytes.clone())
    }

    pub fn item_count(&self) -> usize {
        self.0.lock().unwrap().items.len()
    }

    pub fn sessions_started(&self) -> u32 {
        self.0.lock().unwrap().sessions_started
    }

    pub fn remove_item(&self, id: &str) {
        self.0.lock().unwrap().items.remove(id);
    }

    pub fn truncate_item(&self, id: &str) {
        if let Some((_, bytes)) = self.0.lock().unwrap().items.get_mut(id) {
            bytes.pop();
        }
    }

    fn state(&self) -> CloudResult<std::sync::MutexGuard<'_, State>> {
        let state = self.0.lock().unwrap();
        match &state.failure {
            Some(failure) => Err(failure.clone()),
            None => Ok(state),
        }
    }
}

fn drive_item(id: &str, bytes: &[u8]) -> DriveItem {
    DriveItem { id: id.into(), size: bytes.len() as u64, web_url: format!("https://onedrive/{id}"), download_url: None }
}

impl Cloud for FakeCloud {
    fn find(&self, path: &str) -> CloudResult<Option<DriveItem>> {
        let state = self.state()?;
        Ok(state.items.iter().find(|(_, (p, _))| p == path).map(|(id, (_, bytes))| drive_item(id, bytes)))
    }

    fn item(&self, id: &str) -> CloudResult<Option<DriveItem>> {
        Ok(self.state()?.items.get(id).map(|(_, bytes)| drive_item(id, bytes)))
    }

    fn ensure_folder(&self, _path: &str) -> CloudResult<()> {
        self.state().map(|_| ())
    }

    fn start_upload(&self, path: &str) -> CloudResult<String> {
        let mut state = self.state()?;
        state.sessions_started += 1;
        let url = format!("https://upload/{}", state.sessions_started);
        state.sessions.insert(url.clone(), (path.into(), Vec::new()));
        Ok(url)
    }

    fn upload_chunk(&self, url: &str, chunk: &Path, start: u64, _len: u64, total: u64) -> CloudResult<ChunkReply> {
        let mut state = self.state()?;
        let bytes = std::fs::read(chunk).unwrap();
        let (path, received) = state.sessions.get_mut(url).ok_or(CloudError::NotFound)?;
        if start != received.len() as u64 {
            return Err(CloudError::RangeMismatch);
        }
        received.extend(bytes);
        if (received.len() as u64) < total {
            return Ok(ChunkReply::Next(received.len() as u64));
        }
        let (path, received) = (path.clone(), received.clone());
        state.sessions.remove(url);
        state.next_id += 1;
        let id = format!("item{}", state.next_id);
        // "replace": a new upload to a path takes over from the old item.
        state.items.retain(|_, (p, _)| *p != path);
        state.items.insert(id.clone(), (path, received.clone()));
        Ok(ChunkReply::Done(drive_item(&id, &received)))
    }

    fn upload_status(&self, url: &str) -> CloudResult<u64> {
        Ok(self.state()?.sessions.get(url).ok_or(CloudError::NotFound)?.1.len() as u64)
    }

    fn download(&self, id: &str, part: &Path) -> CloudResult<()> {
        let bytes = self.state()?.items.get(id).ok_or(CloudError::NotFound)?.1.clone();
        let have = std::fs::read(part).map(|b| b.len()).unwrap_or(0);
        let mut existing = std::fs::read(part).unwrap_or_default();
        existing.extend_from_slice(&bytes[have..]);
        std::fs::write(part, existing).unwrap();
        Ok(())
    }

    fn delete(&self, id: &str) -> CloudResult<()> {
        self.state()?.items.remove(id);
        Ok(())
    }
}
