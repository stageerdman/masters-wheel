// The signed-in account, persisted as one macOS Keychain generic-password
// item (JSON: refresh token + account name). Nothing about the sign-in is
// ever written to a plain file.

use security_framework::passwords::{delete_generic_password, get_generic_password, set_generic_password};
use serde::{Deserialize, Serialize};

use super::error::OneDriveError;

const SERVICE: &str = "com.erdman.masterswheel.onedrive";
const ACCOUNT: &str = "signed-in-account";
// errSecItemNotFound
const NOT_FOUND: i32 = -25300;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StoredAccount {
    pub refresh_token: String,
    pub name: String,
}

pub fn load() -> Result<Option<StoredAccount>, OneDriveError> {
    match get_generic_password(SERVICE, ACCOUNT) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|e| OneDriveError::Keychain(format!("stored sign-in is unreadable: {e}"))),
        Err(e) if e.code() == NOT_FOUND => Ok(None),
        Err(e) => Err(OneDriveError::Keychain(e.to_string())),
    }
}

pub fn save(account: &StoredAccount) -> Result<(), OneDriveError> {
    let bytes = serde_json::to_vec(account).map_err(|e| OneDriveError::Internal(e.to_string()))?;
    set_generic_password(SERVICE, ACCOUNT, &bytes).map_err(|e| OneDriveError::Keychain(e.to_string()))
}

// Already gone counts as done.
pub fn clear() -> Result<(), OneDriveError> {
    match delete_generic_password(SERVICE, ACCOUNT) {
        Ok(()) => Ok(()),
        Err(e) if e.code() == NOT_FOUND => Ok(()),
        Err(e) => Err(OneDriveError::Keychain(e.to_string())),
    }
}
