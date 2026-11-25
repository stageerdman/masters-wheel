// What the engine needs from OneDrive, as a trait so the engine's rules are
// tested against a fake. GraphCloud is the real one; CloudError sorts
// OneDriveError into the few cases the engine reacts to differently.

use std::path::Path;

use crate::onedrive::drive::{self, ChunkReply, DriveItem};
use crate::onedrive::{self, OneDriveError, OneDriveSession};

#[derive(Debug, Clone, PartialEq)]
pub enum CloudError {
    // No network, or OneDrive unreachable: wait and retry.
    Offline(String),
    SignedOut,
    Full,
    // The organization took the app's access away.
    Revoked,
    NotFound,
    // The upload session lost track of where it was.
    RangeMismatch,
    // Short server trouble: retry with a backoff.
    Transient(String),
}

impl From<OneDriveError> for CloudError {
    fn from(error: OneDriveError) -> Self {
        match error {
            OneDriveError::Http(m) => Self::Offline(m),
            OneDriveError::NotConnected | OneDriveError::SignInExpired | OneDriveError::NotConfigured => Self::SignedOut,
            OneDriveError::Graph { status: 401, .. } => Self::SignedOut,
            OneDriveError::Graph { status: 403, .. } => Self::Revoked,
            OneDriveError::Graph { status: 404, .. } => Self::NotFound,
            OneDriveError::Graph { status: 416, .. } => Self::RangeMismatch,
            OneDriveError::Graph { status: 507, .. } => Self::Full,
            other => Self::Transient(other.to_string()),
        }
    }
}

impl std::fmt::Display for CloudError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}

pub type CloudResult<T> = Result<T, CloudError>;

pub trait Cloud: Send + Sync {
    fn find(&self, path: &str) -> CloudResult<Option<DriveItem>>;
    fn item(&self, id: &str) -> CloudResult<Option<DriveItem>>;
    fn ensure_folder(&self, path: &str) -> CloudResult<()>;
    fn start_upload(&self, path: &str) -> CloudResult<String>;
    fn upload_chunk(&self, url: &str, chunk: &Path, start: u64, len: u64, total: u64) -> CloudResult<ChunkReply>;
    fn upload_status(&self, url: &str) -> CloudResult<u64>;
    // Appends the item's bytes to `part` from its current length.
    fn download(&self, id: &str, part: &Path) -> CloudResult<()>;
    fn delete(&self, id: &str) -> CloudResult<()>;
}

pub struct GraphCloud<'a> {
    pub session: &'a OneDriveSession,
}

impl GraphCloud<'_> {
    fn token(&self) -> CloudResult<String> {
        Ok(self.session.access_token()?)
    }
}

impl Cloud for GraphCloud<'_> {
    fn find(&self, path: &str) -> CloudResult<Option<DriveItem>> {
        Ok(drive::item_at_path(&self.token()?, path)?)
    }

    fn item(&self, id: &str) -> CloudResult<Option<DriveItem>> {
        Ok(drive::item_by_id(&self.token()?, id)?)
    }

    fn ensure_folder(&self, path: &str) -> CloudResult<()> {
        Ok(onedrive::ensure_folder(&self.token()?, path)?)
    }

    fn start_upload(&self, path: &str) -> CloudResult<String> {
        Ok(drive::create_upload_session(&self.token()?, path)?)
    }

    fn upload_chunk(&self, url: &str, chunk: &Path, start: u64, len: u64, total: u64) -> CloudResult<ChunkReply> {
        Ok(drive::upload_chunk(url, chunk, start, len, total)?)
    }

    fn upload_status(&self, url: &str) -> CloudResult<u64> {
        Ok(drive::upload_status(url)?)
    }

    fn download(&self, id: &str, part: &Path) -> CloudResult<()> {
        let item = self.item(id)?.ok_or(CloudError::NotFound)?;
        let url = item.download_url.ok_or_else(|| CloudError::Transient("no download URL".into()))?;
        Ok(drive::download(&url, part)?)
    }

    fn delete(&self, id: &str) -> CloudResult<()> {
        Ok(drive::delete_item(&self.token()?, id)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn graph(status: u16) -> CloudError {
        OneDriveError::Graph { status, message: "x".into() }.into()
    }

    #[test]
    fn errors_sort_into_what_the_engine_does_next() {
        assert!(matches!(CloudError::from(OneDriveError::Http("dns".into())), CloudError::Offline(_)));
        assert_eq!(CloudError::from(OneDriveError::SignInExpired), CloudError::SignedOut);
        assert_eq!(graph(401), CloudError::SignedOut);
        assert_eq!(graph(403), CloudError::Revoked);
        assert_eq!(graph(404), CloudError::NotFound);
        assert_eq!(graph(416), CloudError::RangeMismatch);
        assert_eq!(graph(507), CloudError::Full);
        assert!(matches!(graph(503), CloudError::Transient(_)));
    }
}
