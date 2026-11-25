// One-shot localhost listener that catches Microsoft's redirect back from
// the browser. It always listens on REDIRECT_PORT, so the Redirect URI in
// the app registration is one exact, known address.

use std::io::ErrorKind;
use std::net::{Ipv4Addr, TcpListener};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tiny_http::{Header, Response, Server, StatusCode};

use super::error::OneDriveError;

// Rarely used by other software (not 3000/8080-style dev ports). Must match
// the Redirect URI registered in Entra: http://localhost:47821
pub const REDIRECT_PORT: u16 = 47821;

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
        Self::bind_on(REDIRECT_PORT)
    }

    fn bind_on(port: u16) -> Result<Self, OneDriveError> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, port)).map_err(|e| match e.kind() {
            ErrorKind::AddrInUse => OneDriveError::PortBusy(port),
            _ => OneDriveError::Internal(format!("couldn't open local sign-in port {port}: {e}")),
        })?;
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

    #[test]
    fn redirect_uri_is_the_fixed_port() {
        assert_eq!(REDIRECT_PORT, 47821);
        assert_eq!(redirect_uri(REDIRECT_PORT), "http://localhost:47821");
    }

    #[test]
    fn binds_the_given_port_and_reports_it_in_the_redirect_uri() {
        let port = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap().local_addr().unwrap().port();
        let loopback = Loopback::bind_on(port).unwrap();
        assert_eq!(loopback.redirect_uri(), format!("http://localhost:{port}"));
    }

    #[test]
    fn a_busy_port_is_a_port_busy_error() {
        let taken = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        let error = Loopback::bind_on(port).err().expect("bind must fail while the port is taken");
        assert_eq!(error, OneDriveError::PortBusy(port));
        assert_eq!(error.kind(), "portBusy");
    }
}
