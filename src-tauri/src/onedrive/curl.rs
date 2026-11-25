// HTTP through the system `curl`, the same "shell out to a real binary"
// pattern transcribe.rs uses. The whole request (URL, headers, body) goes
// in through stdin as a curl config (`-K -`), never as argv: argv is
// readable by every local process via `ps`, and these requests carry auth
// codes, refresh tokens and bearer tokens.

use std::io::Write;
use std::process::{Command, Stdio};

use super::error::OneDriveError;

pub struct HttpRequest<'a> {
    pub method: &'a str,
    pub url: &'a str,
    pub headers: Vec<String>,
    pub body: Option<&'a str>,
}

#[derive(Debug, PartialEq)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
}

impl HttpResponse {
    pub fn is_success(&self) -> bool {
        (200..300).contains(&self.status)
    }
}

const STATUS_MARKER: &str = "\n__MW_HTTP_STATUS__:";

pub fn send(request: &HttpRequest) -> Result<HttpResponse, OneDriveError> {
    let write_out = format!("{STATUS_MARKER}%{{http_code}}");
    // -L: Graph answers file-content GETs with a redirect to a
    // pre-authenticated download URL. curl drops our Authorization header
    // on the cross-host hop, which is what that URL wants.
    let mut child = Command::new("curl")
        .args(["-sS", "-L", "--connect-timeout", "30", "--max-time", "120", "-w", &write_out, "-K", "-"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| OneDriveError::Http(format!("curl isn't available: {e}")))?;
    child
        .stdin
        .take()
        .expect("stdin was piped")
        .write_all(build_config(request).as_bytes())
        .map_err(|e| OneDriveError::Http(format!("couldn't hand the request to curl: {e}")))?;
    let output = child.wait_with_output().map_err(|e| OneDriveError::Http(format!("curl failed: {e}")))?;
    if !output.status.success() {
        return Err(OneDriveError::Http(String::from_utf8_lossy(&output.stderr).trim().to_string()));
    }
    parse_output(&String::from_utf8_lossy(&output.stdout))
}

pub fn build_config(request: &HttpRequest) -> String {
    let mut lines = vec![format!("url = {}", quote(request.url)), format!("request = {}", quote(request.method))];
    lines.extend(request.headers.iter().map(|h| format!("header = {}", quote(h))));
    if let Some(body) = request.body {
        // data-raw, not data/data-binary: those read a file when the value
        // starts with "@".
        lines.push(format!("data-raw = {}", quote(body)));
    }
    lines.join("\n") + "\n"
}

// curl's config-file string syntax: double quotes, backslash escapes.
fn quote(value: &str) -> String {
    let escaped = value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t");
    format!("\"{escaped}\"")
}

fn parse_output(stdout: &str) -> Result<HttpResponse, OneDriveError> {
    let (body, status) = stdout
        .rsplit_once(STATUS_MARKER)
        .ok_or_else(|| OneDriveError::Http("curl gave no status code".into()))?;
    let status = status.trim().parse().map_err(|_| OneDriveError::Http(format!("bad status code {status:?}")))?;
    Ok(HttpResponse { status, body: body.to_string() })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_escapes_quotes_backslashes_and_newlines() {
        let config = build_config(&HttpRequest {
            method: "PUT",
            url: "https://x.test/a b",
            headers: vec!["Authorization: Bearer t\"k".into()],
            body: Some("{\"a\":\"b\\c\"}\n"),
        });
        assert_eq!(
            config,
            "url = \"https://x.test/a b\"\nrequest = \"PUT\"\nheader = \"Authorization: Bearer t\\\"k\"\ndata-raw = \"{\\\"a\\\":\\\"b\\\\c\\\"}\\n\"\n"
        );
    }

    #[test]
    fn config_has_no_body_line_without_a_body() {
        let config = build_config(&HttpRequest { method: "GET", url: "u", headers: vec![], body: None });
        assert!(!config.contains("data"));
    }

    #[test]
    fn output_splits_body_from_status() {
        assert_eq!(
            parse_output("{\"ok\":1}\n__MW_HTTP_STATUS__:201").unwrap(),
            HttpResponse { status: 201, body: "{\"ok\":1}".into() }
        );
        assert!(parse_output("no marker").is_err());
    }
}
