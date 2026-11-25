// The background worker: one thread that keeps planning and running the
// engine's jobs, saving the ledger after each, and telling the webview
// ("storage://changed"). Commands reach it through StorageService.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager};

use crate::onedrive::{OneDriveError, OneDriveSession};

use super::cloud::{Cloud, GraphCloud};
use super::engine::Engine;
use super::ledger::Ledger;
use super::room::{DiskSpace, disk_space};
use super::scan::scan;
use super::work::{CHUNK_SIZE, Context, perform};

const IDLE_WAIT: Duration = Duration::from_secs(60);
const SCAN_EVERY: Duration = Duration::from_secs(20);
// OneDrive download URLs last about an hour.
const STREAM_URL_TTL: Duration = Duration::from_secs(30 * 60);
pub const CHANGED_EVENT: &str = "storage://changed";

struct Shared {
    engine: Mutex<Engine>,
    poked: Mutex<bool>,
    wake: Condvar,
    recheck: AtomicBool,
    ledger_path: PathBuf,
    context: Context,
    stream_urls: Mutex<HashMap<String, (String, Instant)>>,
    // Tells the webview the overview is stale.
    changed: Box<dyn Fn() + Send + Sync>,
}

#[derive(Clone)]
pub struct StorageService(Arc<Shared>);

pub fn unix_now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs())
}

impl StorageService {
    pub fn spawn(app: AppHandle, wheel_root: PathBuf, data_dir: PathBuf) -> Self {
        let ledger_path = data_dir.join("onedrive").join("videos.json");
        let ledger = Ledger::load(&ledger_path).unwrap_or_else(|e| {
            log::warn!(target: "storage", "[start] {e}; starting with an empty ledger");
            Ledger::default()
        });
        let scratch = data_dir.join("onedrive").join("chunks");
        let emitter = app.clone();
        let changed = move || {
            if let Err(e) = emitter.emit(CHANGED_EVENT, ()) {
                log::warn!(target: "storage", "[changed] {e}");
            }
        };
        let service = Self::new(ledger, ledger_path, wheel_root, scratch, Box::new(changed));
        let worker = service.clone();
        std::thread::Builder::new()
            .name("storage".into())
            .spawn(move || worker.run(&app))
            .expect("spawn the storage worker");
        service
    }

    fn new(ledger: Ledger, ledger_path: PathBuf, wheel_root: PathBuf, scratch: PathBuf, changed: Box<dyn Fn() + Send + Sync>) -> Self {
        let context = Context { wheel_root: wheel_root.clone(), scratch, chunk_size: CHUNK_SIZE };
        Self(Arc::new(Shared {
            engine: Mutex::new(Engine::new(ledger, wheel_root)),
            poked: Mutex::new(false),
            wake: Condvar::new(),
            recheck: AtomicBool::new(true),
            ledger_path,
            context,
            stream_urls: Mutex::new(HashMap::new()),
            changed,
        }))
    }

    // Runs `change` on the engine, saves, tells the webview, and nudges the
    // worker. The webview must hear about it even when no job follows
    // (a mode switch with nothing to move, a plain disconnect).
    pub fn update<T>(&self, change: impl FnOnce(&mut Engine) -> T) -> T {
        let result = change(&mut self.engine());
        self.save();
        (self.0.changed)();
        self.poke();
        result
    }

    pub fn read<T>(&self, look: impl FnOnce(&Engine) -> T) -> T {
        look(&self.engine())
    }

    pub fn disk(&self) -> Option<DiskSpace> {
        disk_space(self.engine().wheel_root())
    }

    pub fn poke(&self) {
        *self.0.poked.lock().expect("storage poke mutex") = true;
        self.0.wake.notify_all();
    }

    // Signed in or out, back online, app opened: re-read the account,
    // rescan, and retry everything that was waiting.
    pub fn recheck(&self) {
        self.0.recheck.store(true, Ordering::SeqCst);
        self.poke();
    }

    // Deletes the sign-in now; anything only in OneDrive stays there.
    pub fn disconnect_now(&self, session: &OneDriveSession) -> Result<(), OneDriveError> {
        session.sign_out().map_err(|e| e.context("disconnecting"))?;
        self.update(Engine::disconnected);
        Ok(())
    }

    // For the media server: `path` is where the video would be on this Mac.
    pub fn stream_url_for_path(&self, path: &std::path::Path, session: &OneDriveSession) -> Option<String> {
        let key = self.read(|e| e.key_for_path(path).filter(|key| !e.ledger.videos[key].on_mac))?;
        self.stream_url(&key, session)
    }

    // A playable URL for a video that's only in OneDrive (SPEC 6.4).
    pub fn stream_url(&self, key: &str, session: &OneDriveSession) -> Option<String> {
        if let Some((url, at)) = self.0.stream_urls.lock().expect("stream url mutex").get(key) {
            if at.elapsed() < STREAM_URL_TTL {
                return Some(url.clone());
            }
        }
        let item_id = self.read(|e| e.ledger.videos.get(key).and_then(|v| v.receipt.as_ref()).map(|r| r.item_id.clone()))?;
        let url = match (GraphCloud { session }).item(&item_id) {
            Ok(item) => item?.download_url?,
            Err(e) => {
                log::warn!(target: "storage", "[{key}] stream: {e}");
                return None;
            }
        };
        self.0.stream_urls.lock().expect("stream url mutex").insert(key.into(), (url.clone(), Instant::now()));
        Some(url)
    }

    fn engine(&self) -> MutexGuard<'_, Engine> {
        self.0.engine.lock().expect("storage engine mutex poisoned")
    }

    fn save(&self) {
        let engine = self.engine();
        if let Err(e) = engine.ledger.save(&self.0.ledger_path) {
            log::error!(target: "storage", "[save] {e}");
        }
    }

    fn run(&self, app: &AppHandle) {
        let session = app.state::<OneDriveSession>();
        let cloud = GraphCloud { session: &session };
        let mut last_scan: Option<Instant> = None;
        loop {
            if self.0.recheck.swap(false, Ordering::SeqCst) {
                self.refresh_account(&session);
                last_scan = None;
            }
            if last_scan.is_none_or(|at| at.elapsed() >= SCAN_EVERY) {
                self.rescan();
                last_scan = Some(Instant::now());
            }
            if self.read(Engine::disconnect_ready) {
                self.finish_disconnect(&session);
                continue;
            }
            let (now, disk) = (unix_now(), self.disk());
            let Some(job) = self.engine().plan(now, disk) else {
                self.idle();
                continue;
            };
            let outcome = perform(&job, &cloud, &self.0.context);
            self.engine().finish(&job, outcome, unix_now(), self.disk());
            self.save();
            (self.0.changed)();
        }
    }

    // "Download and disconnect" brought the last video home.
    // On success disconnect_now's update has already told the webview.
    fn finish_disconnect(&self, session: &OneDriveSession) {
        if let Err(e) = self.disconnect_now(session) {
            // Stay in "disconnecting" so the panel keeps its Stop button;
            // the next pass tries again.
            log::error!(target: "storage", "[disconnect] {e}");
            self.idle();
        }
    }

    fn refresh_account(&self, session: &OneDriveSession) {
        let account = match session.status() {
            Ok(status) => status.account.filter(|_| status.connected),
            Err(e) => {
                log::warn!(target: "storage", "[account] {e}");
                None
            }
        };
        {
            let mut engine = self.engine();
            engine.set_account(account);
            engine.wake();
        }
        // Signing in or out changes the panel even if no job follows.
        (self.0.changed)();
    }

    // Only while connected: someone who never connects keeps today's app.
    fn rescan(&self) {
        let root = {
            let engine = self.engine();
            if !engine.health.signed_in {
                return;
            }
            engine.wheel_root().to_path_buf()
        };
        match scan(&root) {
            Ok(found) => {
                self.engine().reconcile(&found);
                self.save();
            }
            Err(e) => log::warn!(target: "storage", "[scan] {e}"),
        }
    }

    fn idle(&self) {
        let poked = self.0.poked.lock().expect("storage poke mutex");
        let (mut poked, _) = self.0.wake.wait_timeout_while(poked, IDLE_WAIT, |poked| !*poked).expect("storage poke mutex");
        *poked = false;
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::AtomicUsize;

    use super::*;
    use crate::storage::model::Mode;
    use crate::storage::testdir::TestDir;

    // No worker thread: only `update` runs, so any change heard came from it.
    fn service(dir: &TestDir) -> (StorageService, Arc<AtomicUsize>) {
        let heard = Arc::new(AtomicUsize::new(0));
        let counter = heard.clone();
        let changed = Box::new(move || {
            counter.fetch_add(1, Ordering::SeqCst);
        });
        let root = dir.path().to_path_buf();
        let service = StorageService::new(Ledger::default(), root.join("videos.json"), root.clone(), root.join("chunks"), changed);
        (service, heard)
    }

    #[test]
    fn a_mode_switch_with_nothing_to_move_tells_the_webview() {
        let dir = TestDir::new("service-mode");
        let (service, heard) = service(&dir);
        service.update(|engine| engine.set_mode(Mode::Smart));
        assert_eq!(heard.load(Ordering::SeqCst), 1);
        assert_eq!(service.read(|engine| engine.ledger.mode), Mode::Smart);
    }

    #[test]
    fn a_plain_disconnect_tells_the_webview() {
        let dir = TestDir::new("service-disconnect");
        let (service, heard) = service(&dir);
        service.update(|engine| engine.set_account(Some("a@b".into())));
        service.update(Engine::disconnected);
        assert_eq!(heard.load(Ordering::SeqCst), 2);
        assert!(!service.read(|engine| engine.ledger.connected));
    }

    #[test]
    fn stop_disconnecting_with_nothing_downloading_tells_the_webview() {
        let dir = TestDir::new("service-stop");
        let (service, heard) = service(&dir);
        service.update(|engine| engine.set_disconnecting(true));
        service.update(|engine| engine.set_disconnecting(false));
        assert_eq!(heard.load(Ordering::SeqCst), 2);
        assert!(!service.read(|engine| engine.ledger.disconnecting));
    }
}
