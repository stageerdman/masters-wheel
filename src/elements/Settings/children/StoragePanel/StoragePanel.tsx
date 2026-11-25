"use client";

import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  cancelConnectOneDrive,
  connectOneDrive,
  disconnectOneDrive,
  ensureAppFolder,
  getOneDriveStatus,
  type OneDriveStatus,
} from "@/lib/onedrive";
import position from "./StoragePanel.position.module.css";
import styles from "./StoragePanel.styles.module.css";

type Busy = "loading" | "connecting" | "preparing" | "disconnecting" | null;

// Settings → Storage: optional OneDrive connection. Connecting signs in
// through the browser, then creates the app's folder in OneDrive.
export function StoragePanel() {
  const [status, setStatus] = useState<OneDriveStatus | null>(null);
  const [busy, setBusy] = useState<Busy>("loading");
  const [error, setError] = useState<string | null>(null);
  const [folderReady, setFolderReady] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    getOneDriveStatus()
      .then(setStatus)
      .catch((e) => setError(String(e)))
      .finally(() => setBusy(null));
  }, []);

  async function run(next: Busy, task: () => Promise<void>) {
    setBusy(next);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function prepareFolder() {
    setBusy("preparing");
    await ensureAppFolder();
    setFolderReady(true);
  }

  const connect = () =>
    run("connecting", async () => {
      setStatus(await connectOneDrive());
      await prepareFolder();
    });

  const disconnect = () =>
    run("disconnecting", async () => {
      setStatus(await disconnectOneDrive());
      setFolderReady(false);
    });

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <h2 className={`${styles.title} ${position.title}`} data-construction>
        OneDrive
      </h2>
      <p className={`${styles.text} ${position.text}`} data-construction role="status">
        {describe(status, busy, folderReady)}
      </p>
      {error && (
        <p className={`${styles.error} ${position.text}`} data-construction role="alert">
          {error}
        </p>
      )}
      <div className={position.actions} data-construction>
        {status?.connected ? (
          <>
            <button type="button" className={`${styles.button} ${position.button}`} data-construction disabled={busy !== null} onClick={disconnect}>
              Disconnect
            </button>
            {error && (
              <button type="button" className={`${styles.button} ${position.button}`} data-construction disabled={busy !== null} onClick={() => run("preparing", prepareFolder)}>
                Retry folder setup
              </button>
            )}
          </>
        ) : busy === "connecting" ? (
          <button type="button" className={`${styles.button} ${position.button}`} data-construction onClick={() => cancelConnectOneDrive()}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.button} ${styles.primary} ${position.button}`}
            data-construction
            disabled={busy !== null || !status?.configured}
            onClick={connect}
          >
            Connect OneDrive
          </button>
        )}
      </div>
    </div>
  );
}

function describe(status: OneDriveStatus | null, busy: Busy, folderReady: boolean): string {
  if (!isTauri()) return "Available in the Mac app.";
  if (busy === "loading") return "Checking…";
  if (busy === "connecting") return "Finish signing in in your browser.";
  if (busy === "preparing") return "Creating the app folder in your OneDrive…";
  if (busy === "disconnecting") return "Disconnecting…";
  if (!status) return "OneDrive status is unavailable.";
  if (!status.configured) return "OneDrive isn't set up in this build yet.";
  if (!status.connected) return "Optional. Keep your videos in your own OneDrive. Videos stay on this Mac until you connect.";
  const folder = folderReady ? " Folder ready: OneDrive › Apps › Master's Wheel." : "";
  return `Connected as ${status.account ?? "your Microsoft account"}.${folder}`;
}
