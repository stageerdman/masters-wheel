// A tiny local HTTP server for streaming hero video files.
//
// Why this exists instead of Tauri's built-in `asset://` protocol
// (`convertFileSrc`): that protocol buffers the *entire* file into memory
// for any request that doesn't carry a `Range` header (see
// `tauri::protocol::asset::get_response` — the no-range branch does
// `Vec::with_capacity(len)` + `read_to_end`). Whether the webview's first
// request for a given video carries a Range header or not is outside our
// control, and for the two longest recordings in this library (~1.5-1.8GB)
// that path reliably fails to load at all. A real HTTP server streams the
// body via `io::copy` regardless, which is how every video site on the
// actual internet already serves multi-gigabyte files.
//
// Scope is intentionally the same as the existing `fs` capability
// (`space-data.json`): anything under the Master's Wheel storage root. This
// introduces no new trust boundary — the frontend can already read that
// whole tree via the fs plugin.
//
// The root is held behind a Mutex, not captured once at spawn time: the
// user can switch Spaces while the app is running, and the server has to
// start serving the newly active Space's records root on the very next
// request — see MediaServerHandle::set_root, called from
// spaces::switch_space_media_root.

use std::{
  fs::File,
  io::{Read, Seek, SeekFrom},
  net::Ipv4Addr,
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
};

use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const PORT: u16 = 47821;
const WORKER_THREADS: usize = 4;

#[derive(Clone)]
pub struct MediaServerHandle {
  root: Arc<Mutex<PathBuf>>,
}

impl MediaServerHandle {
  pub fn set_root(&self, new_root: PathBuf) {
    *self.root.lock().expect("media server root mutex poisoned") = new_root;
  }
}

pub fn spawn(initial_root: PathBuf) -> MediaServerHandle {
  let root = Arc::new(Mutex::new(initial_root));
  let handle = MediaServerHandle { root: Arc::clone(&root) };

  let server = match Server::http((Ipv4Addr::LOCALHOST, PORT)) {
    Ok(server) => Arc::new(server),
    Err(e) => {
      eprintln!("media server: failed to bind 127.0.0.1:{PORT}: {e}");
      return handle;
    }
  };

  for _ in 0..WORKER_THREADS {
    let server = Arc::clone(&server);
    let root = Arc::clone(&root);
    std::thread::spawn(move || {
      while let Ok(request) = server.recv() {
        let current_root = root.lock().expect("media server root mutex poisoned").clone();
        handle_request(request, &current_root);
      }
    });
  }

  handle
}

fn handle_request(request: Request, root: &Path) {
  let raw_path = request.url().split('?').next().unwrap_or("");
  let decoded = percent_decode(raw_path.trim_start_matches('/'));

  let resolved = match resolve_within_root(root, &decoded) {
    Some(path) => path,
    None => {
      let _ = request.respond(Response::empty(StatusCode(404)));
      return;
    }
  };

  // Reject directories explicitly — opening one as a `File` succeeds on
  // macOS, but reading from it later never completes, hanging the
  // connection rather than erroring.
  if !resolved.is_file() {
    let _ = request.respond(Response::empty(StatusCode(404)));
    return;
  }

  let file = match File::open(&resolved) {
    Ok(file) => file,
    Err(_) => {
      let _ = request.respond(Response::empty(StatusCode(404)));
      return;
    }
  };

  let len = match file.metadata() {
    Ok(meta) => meta.len(),
    Err(_) => {
      let _ = request.respond(Response::empty(StatusCode(500)));
      return;
    }
  };

  let content_type = mime_type_for(&resolved);

  if *request.method() == Method::Head {
    let response = Response::empty(StatusCode(200))
      .with_header(header("Content-Length", &len.to_string()))
      .with_header(header("Accept-Ranges", "bytes"))
      .with_header(header("Content-Type", content_type));
    let _ = request.respond(response);
    return;
  }

  let range_header = request
    .headers()
    .iter()
    .find(|h| h.field.equiv("Range"))
    .map(|h| h.value.as_str().to_string());

  match range_header.and_then(|value| parse_range(&value, len)) {
    Some((start, end)) => respond_partial(request, file, content_type, start, end, len),
    None if range_header_was_present(&request) => {
      let response = Response::empty(StatusCode(416))
        .with_header(header("Content-Range", &format!("bytes */{len}")));
      let _ = request.respond(response);
    }
    None => {
      // No Range header: stream the whole file via `Response::from_file`,
      // which `io::copy`s rather than buffering it — see the module doc.
      let response = Response::from_file(file)
        .with_header(header("Accept-Ranges", "bytes"))
        .with_header(header("Content-Type", content_type));
      let _ = request.respond(response);
    }
  }
}

// `range_header` is consumed by the first lookup above, so a second,
// cheap check here (rather than threading an extra bool through) tells us
// whether a Range header was present but failed to parse/satisfy — that
// case must 416, not fall through to "serve the whole file".
fn range_header_was_present(request: &Request) -> bool {
  request.headers().iter().any(|h| h.field.equiv("Range"))
}

fn respond_partial(
  request: Request,
  mut file: File,
  content_type: &str,
  start: u64,
  end: u64,
  total_len: u64,
) {
  if file.seek(SeekFrom::Start(start)).is_err() {
    let _ = request.respond(Response::empty(StatusCode(500)));
    return;
  }
  let chunk_len = end - start + 1;
  let response = Response::new(
    StatusCode(206),
    vec![
      header("Content-Type", content_type),
      header("Accept-Ranges", "bytes"),
      header("Content-Range", &format!("bytes {start}-{end}/{total_len}")),
    ],
    file.take(chunk_len),
    Some(chunk_len as usize),
    None,
  );
  let _ = request.respond(response);
}

fn header(name: &str, value: &str) -> Header {
  Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("static header name/value is valid ASCII")
}

// Single-range `Range: bytes=start-end` / `bytes=start-` parsing — enough
// for a `<video>` element's needs, no multi-range support.
fn parse_range(header_value: &str, len: u64) -> Option<(u64, u64)> {
  let spec = header_value.strip_prefix("bytes=")?;
  let (start_str, end_str) = spec.split_once('-')?;
  let start: u64 = start_str.parse().ok()?;
  let end: u64 = if end_str.is_empty() {
    len.saturating_sub(1)
  } else {
    end_str.parse().ok()?
  };
  if len == 0 || start > end || start >= len {
    return None;
  }
  Some((start, end.min(len - 1)))
}

fn percent_decode(input: &str) -> String {
  let bytes = input.as_bytes();
  let mut out = Vec::with_capacity(bytes.len());
  let mut i = 0;
  while i < bytes.len() {
    if bytes[i] == b'%' && i + 2 < bytes.len() {
      if let Ok(byte) = u8::from_str_radix(&input[i + 1..i + 3], 16) {
        out.push(byte);
        i += 3;
        continue;
      }
    }
    out.push(bytes[i]);
    i += 1;
  }
  String::from_utf8_lossy(&out).into_owned()
}

// Joins the decoded request path onto the storage root and verifies the
// result still resolves inside it (symlink-aware, via canonicalize) —
// blocks `..` traversal out of the Master's Wheel folder.
fn resolve_within_root(root: &Path, relative: &str) -> Option<PathBuf> {
  let candidate = root.join(relative);
  let canonical_root = root.canonicalize().ok()?;
  let canonical_candidate = candidate.canonicalize().ok()?;
  if canonical_candidate.starts_with(&canonical_root) {
    Some(canonical_candidate)
  } else {
    None
  }
}

fn mime_type_for(path: &Path) -> &'static str {
  match path
    .extension()
    .and_then(|ext| ext.to_str())
    .map(|ext| ext.to_ascii_lowercase())
  {
    Some(ext) if ext == "mov" => "video/quicktime",
    Some(ext) if ext == "mp4" || ext == "m4v" => "video/mp4",
    Some(ext) if ext == "webm" => "video/webm",
    _ => "application/octet-stream",
  }
}
