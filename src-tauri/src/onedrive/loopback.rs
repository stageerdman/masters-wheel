// One-shot localhost listener that catches Microsoft's redirect back from
// the browser. It tries PREFERRED_PORT and, if something else holds it,
// takes any free port: for a "Mobile and desktop" app registration,
// Microsoft ignores the port of an http://localhost redirect URI (RFC 8252
// loopback rule), so every port matches the registered URI.
// The listener is closed when the Loopback is dropped, i.e. as soon as
// sign-in finishes, fails or is cancelled.

use std::io::ErrorKind;
use std::net::{Ipv4Addr, TcpListener};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tiny_http::{Header, Response, Server, StatusCode};

use super::error::OneDriveError;

// Not 47821: the app's own media server (media_server.rs) holds that one.
// Below macOS's ephemeral range (49152+), so the OS rarely hands it out.
pub const PREFERRED_PORT: u16 = 38291;
const ANY_FREE_PORT: u16 = 0;

const POLL: Duration = Duration::from_millis(500);
const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Master's Wheel</title>\
<body style=\"font-family:-apple-system,sans-serif;padding:3rem\">\
<h2>You can close this tab.</h2><p>Go back to Master's Wheel.</p></body>";

pub fn redirect_uri(port: u16) -> String {
    format!("http://localhost:{port}")
}

pub struct Loopback {
    server: Server,
    port: u16,
}

impl Loopback {
    pub fn bind() -> Result<Self, OneDriveError> {
        Self::bind_preferring(PREFERRED_PORT)
    }

    fn bind_preferring(port: u16) -> Result<Self, OneDriveError> {
        let listener = match TcpListener::bind((Ipv4Addr::LOCALHOST, port)) {
            Err(e) if e.kind() == ErrorKind::AddrInUse => TcpListener::bind((Ipv4Addr::LOCALHOST, ANY_FREE_PORT)),
            other => other,
        }
        .map_err(|e| OneDriveError::Internal(format!("couldn't open a local sign-in port: {e}")))?;
        let port = listener
            .local_addr()
            .map_err(|e| OneDriveError::Internal(format!("couldn't read the local sign-in port: {e}")))?
            .port();
        let server = Server::from_listener(listener, None)
            .map_err(|e| OneDriveError::Internal(format!("couldn't serve local sign-in port {port}: {e}")))?;
        Ok(Self { server, port })
    }

    pub fn redirect_uri(&self) -> String {
        redirect_uri(self.port)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn free_port() -> u16 {
        TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap().local_addr().unwrap().port()
    }

    #[test]
    fn preferred_port_is_not_the_media_servers() {
        assert_ne!(PREFERRED_PORT, 47821);
        assert_eq!(redirect_uri(PREFERRED_PORT), "http://localhost:38291");
    }

    #[test]
    fn binds_the_preferred_port_when_free() {
        let port = free_port();
        let loopback = Loopback::bind_preferring(port).unwrap();
        assert_eq!(loopback.redirect_uri(), format!("http://localhost:{port}"));
    }

    #[test]
    fn a_busy_preferred_port_falls_back_to_a_free_one() {
        let taken = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let busy = taken.local_addr().unwrap().port();
        let loopback = Loopback::bind_preferring(busy).unwrap();
        assert_ne!(loopback.port, busy);
        assert_ne!(loopback.port, 0);
        assert_eq!(loopback.redirect_uri(), format!("http://localhost:{}", loopback.port));
    }

    #[test]
    fn the_port_is_released_once_sign_in_ends() {
        let port = free_port();
        let loopback = Loopback::bind_preferring(port).unwrap();
        let cancelled = AtomicBool::new(true);
        assert_eq!(loopback.wait_for_redirect(POLL, &cancelled), Err(OneDriveError::SignInCancelled));
        drop(loopback);
        // tiny_http closes the listener on its own accept thread just after
        // the drop, so the port frees up shortly, not at the drop itself.
        let deadline = Instant::now() + Duration::from_secs(2);
        while TcpListener::bind((Ipv4Addr::LOCALHOST, port)).is_err() {
            assert!(Instant::now() < deadline, "port {port} was never released");
            std::thread::sleep(Duration::from_millis(20));
        }
    }
}
