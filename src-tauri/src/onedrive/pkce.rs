// PKCE (RFC 7636) for a public client: no client secret, so the verifier
// proves the code exchange comes from whoever started the sign-in.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use sha2::{Digest, Sha256};

use super::error::OneDriveError;

pub struct Pkce {
    pub verifier: String,
    pub challenge: String,
}

// URL-safe random string from `bytes` of OS randomness (32 bytes -> 43
// chars, inside PKCE's 43..128 verifier length).
pub fn random_token(bytes: usize) -> Result<String, OneDriveError> {
    let mut buffer = vec![0u8; bytes];
    getrandom::fill(&mut buffer).map_err(|e| OneDriveError::Internal(format!("no system randomness: {e}")))?;
    Ok(URL_SAFE_NO_PAD.encode(buffer))
}

pub fn challenge_for(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn new_pkce() -> Result<Pkce, OneDriveError> {
    let verifier = random_token(32)?;
    Ok(Pkce { challenge: challenge_for(&verifier), verifier })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn challenge_matches_rfc_7636_example() {
        // Appendix B of RFC 7636.
        assert_eq!(
            challenge_for("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn verifier_is_url_safe_and_long_enough() {
        let pkce = new_pkce().unwrap();
        assert_eq!(pkce.verifier.len(), 43);
        assert!(pkce.verifier.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
        assert_ne!(new_pkce().unwrap().verifier, pkce.verifier);
    }
}
