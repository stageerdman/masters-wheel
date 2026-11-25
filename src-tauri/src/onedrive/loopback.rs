// One-shot localhost listener that catches Microsoft's redirect back from
// the browser. Microsoft ignores the port when matching a registered
// `http://localhost` redirect for desktop apps, so we bind any free port.

use std::net::Ipv4Addr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tiny_http::{Header, Response, Server, StatusCode};

use super::error::OneDriveError;

const POLL: Duration = Duration::from_millis(500);
const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Master's Wheel</title>\
<body style=\"font-family:-apple-system,sans-serif;padding:3rem\">\
<h2>You can close this tab.</h2><p>Go back to Master's Wheel.</p></body>";

pub struct Loopback {
    server: Server,
    port: u16,
}

impl Loopback {
    pub fn bind() -> Result<Self, OneDriveError> {
        let server = Server::http((Ipv4Addr::LOCALHOST, 0))
            .map_err(|e| OneDriveError::Internal(format!("couldn't open a local sign-in port: {e}")))?;
        let port = server
            .server_addr()
            .to_ip()
            .map(|addr| addr.port())
            .ok_or_else(|| OneDriveError::Internal("local sign-in port has no address".into()))?;
        Ok(Self { server, port })
    }

    pub fn redirect_uri(&self) -> String {
        format!("http://localhost:{}", self.port)
    }

    // Returns the path+query of the first request that carries a query
    // string (the redirect); anything else (e.g. /favicon.ico) gets a 404.
    pub fn wait_for_redirect(&self, timeout: Duration, cancelled: &AtomicBool) -> Result<String, OneDriveError> {
        let deadline = Instant::now() + timeout;
        loop {
            if cancelled.load(Ordering::SeqCst) {
                return Err(OneDriveError::SignInCancelled);
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return Err(OneDriveError::SignInTimedOut);
            }
            let request = self
                .server
                .recv_timeout(remaining.min(POLL))
                .map_err(|e| OneDriveError::Internal(format!("local sign-in port failed: {e}")))?;
            let Some(request) = request else { continue };
            let url = request.url().to_string();
            if !url.contains('?') {
                let _ = request.respond(Response::empty(StatusCode(404)));
                continue;
            }
            let html = Header::from_bytes("Content-Type", "text/html; charset=utf-8").expect("static header is valid");
            let _ = request.respond(Response::from_string(DONE_PAGE).with_header(html));
            return Ok(url);
        }
    }
}
