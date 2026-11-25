// The few Microsoft Graph calls the app makes, all inside its own app
// folder (`/me/drive/special/approot`, i.e. OneDrive/Apps/<app name>/).
// Paths are "/"-separated and relative to that folder, e.g.
// "Default/Frame Drills".

use super::curl::{self, HttpRequest, HttpResponse};
use super::error::OneDriveError;

pub(super) const GRAPH: &str = "https://graph.microsoft.com/v1.0";

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct Account {
    pub name: String,
}

pub fn me(token: &str) -> Result<Account, OneDriveError> {
    let response = call(token, "GET", &format!("{GRAPH}/me?$select=displayName,userPrincipalName"), None)?;
    let value = json(&response)?;
    let pick = |key: &str| value.get(key).and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(str::to_string);
    let name = pick("userPrincipalName").or_else(|| pick("displayName")).unwrap_or_else(|| "OneDrive".into());
    Ok(Account { name })
}

// The app folder on OneDrive web ("Show in OneDrive").
pub fn app_folder_web_url(token: &str) -> Result<String, OneDriveError> {
    let response = call(token, "GET", &format!("{GRAPH}/me/drive/special/approot?$select=webUrl"), None)?;
    json(&response)?
        .get("webUrl")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .ok_or_else(|| OneDriveError::Internal("the app folder has no web address".into()))
}

// Creates every missing folder along `path`. Existing folders are fine.
pub fn ensure_folder(token: &str, path: &str) -> Result<(), OneDriveError> {
    let segments = split_path(path)?;
    if call(token, "GET", &item_url(&segments), None)?.is_success() {
        return Ok(());
    }
    for depth in 0..segments.len() {
        let body = serde_json::json!({
            "name": segments[depth],
            "folder": {},
            "@microsoft.graph.conflictBehavior": "fail",
        })
        .to_string();
        let url = format!("{}/children", item_url(&segments[..depth]));
        let response = call(token, "POST", &url, Some(&body))?;
        if !response.is_success() && response.status != 409 {
            return Err(graph_error(&response).context(&format!("creating folder {}", segments[..=depth].join("/"))));
        }
    }
    Ok(())
}

// `None` when the file doesn't exist yet.
pub fn read_text(token: &str, path: &str) -> Result<Option<String>, OneDriveError> {
    let segments = split_path(path)?;
    let response = call(token, "GET", &format!("{}/content", item_url(&segments)), None)?;
    match response.status {
        404 => Ok(None),
        _ if response.is_success() => Ok(Some(response.body)),
        _ => Err(graph_error(&response).context(&format!("reading {path}"))),
    }
}

// Simple upload: fine for small files like the manifest (Graph caps it at
// 4 MB; videos will use upload sessions).
pub fn write_text(token: &str, path: &str, text: &str) -> Result<(), OneDriveError> {
    let segments = split_path(path)?;
    let response = call(token, "PUT", &format!("{}/content", item_url(&segments)), Some(text))?;
    if response.is_success() {
        Ok(())
    } else {
        Err(graph_error(&response).context(&format!("writing {path}")))
    }
}

pub(super) fn call(token: &str, method: &str, url: &str, body: Option<&str>) -> Result<HttpResponse, OneDriveError> {
    let mut headers = vec![format!("Authorization: Bearer {token}")];
    if body.is_some() {
        headers.push("Content-Type: application/json".into());
    }
    curl::send(&HttpRequest { method, url, headers, body, ..Default::default() })
}

pub(super) fn json(response: &HttpResponse) -> Result<serde_json::Value, OneDriveError> {
    if !response.is_success() {
        return Err(graph_error(response));
    }
    serde_json::from_str(&response.body).map_err(|e| OneDriveError::Graph {
        status: response.status,
        message: format!("unreadable response: {e}"),
    })
}

pub(super) fn graph_error(response: &HttpResponse) -> OneDriveError {
    let message = serde_json::from_str::<serde_json::Value>(&response.body)
        .ok()
        .and_then(|v| v.pointer("/error/message").and_then(|m| m.as_str()).map(str::to_string))
        .unwrap_or_else(|| "no details".into());
    OneDriveError::Graph { status: response.status, message }
}

pub(super) fn split_path(path: &str) -> Result<Vec<String>, OneDriveError> {
    let segments: Vec<String> = path.split('/').filter(|s| !s.is_empty()).map(str::to_string).collect();
    if segments.iter().any(|s| s == "." || s == "..") {
        return Err(OneDriveError::Internal(format!("invalid OneDrive path {path:?}")));
    }
    Ok(segments)
}

pub(super) fn item_url(segments: &[String]) -> String {
    let root = format!("{GRAPH}/me/drive/special/approot");
    if segments.is_empty() {
        return root;
    }
    let encoded: Vec<String> = segments.iter().map(|s| encode_segment(s)).collect();
    format!("{root}:/{}:", encoded.join("/"))
}

fn encode_segment(segment: &str) -> String {
    segment
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn item_urls_address_the_app_folder() {
        assert_eq!(item_url(&[]), "https://graph.microsoft.com/v1.0/me/drive/special/approot");
        let segments = split_path("/Default/Frame Drills/").unwrap();
        assert_eq!(
            item_url(&segments),
            "https://graph.microsoft.com/v1.0/me/drive/special/approot:/Default/Frame%20Drills:"
        );
    }

    #[test]
    fn segments_are_percent_encoded_as_utf8() {
        assert_eq!(encode_segment("Bob's #1 ü"), "Bob%27s%20%231%20%C3%BC");
    }

    #[test]
    fn dot_segments_are_rejected() {
        assert!(split_path("a/../b").is_err());
        assert!(split_path("./a").is_err());
    }

    #[test]
    fn graph_errors_carry_the_message() {
        let response = HttpResponse { status: 507, body: r#"{"error":{"code":"quotaLimitReached","message":"Full"}}"#.into() };
        assert_eq!(graph_error(&response), OneDriveError::Graph { status: 507, message: "Full".into() });
    }
}
