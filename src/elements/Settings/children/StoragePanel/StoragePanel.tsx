"use client";

import { useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  numbersLine,
  openManageStorage,
  problemNotice,
  retryUnreadableVideos,
  showFolderInOneDrive,
  stopDisconnecting,
  type NoticeAction,
  type StorageOverview,
} from "@/lib/onedrive";
import { useStorageOverview } from "@/lib/onedrive/useStorageOverview";
import { AccountBlock } from "./children/AccountBlock/AccountBlock";
import { ConfirmSheet } from "./children/ConfirmSheet/ConfirmSheet";
import { ModePicker } from "./children/ModePicker/ModePicker";
import { ProblemNotice } from "./children/ProblemNotice/ProblemNotice";
import { useConnect, useRecordTitles, useSheets, type PanelLine } from "./StoragePanel.script";
import position from "./StoragePanel.position.module.css";
import styles from "./StoragePanel.styles.module.css";

// Settings › Storage (docs/onedrive-storage/SPEC.md §5): optional OneDrive.
// Every storage action lives here; the engine (src-tauri/src/storage) does
// the work and reports back through the overview.
export function StoragePanel() {
  const heading = useRef<HTMLHeadingElement>(null);
  const { overview, refresh } = useStorageOverview();
  const connection = useConnect();

  async function connect() {
    if (await connection.connect()) {
      refresh();
      heading.current?.focus();
    }
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.header} data-construction>
        <h2 ref={heading} tabIndex={-1} className={`${styles.title} ${position.text}`} data-construction>
          Storage
        </h2>
        <p className={`${styles.micro} ${position.text}`} data-construction>
          For all Spaces.
        </p>
      </div>
      {!isTauri() ? (
        <p className={`${styles.body} ${position.text}`} data-construction>
          Available in the Mac app.
        </p>
      ) : overview === null ? null : overview.connected ? (
        <Connected overview={overview} connection={connection} onSignIn={connect} />
      ) : (
        <NotConnected connection={connection} onConnect={connect} />
      )}
    </div>
  );
}

type Connection = ReturnType<typeof useConnect>;

function Line({ line }: { line: PanelLine | null }) {
  if (!line) return null;
  return (
    <p
      className={`${line.tone === "accent" ? `${styles.accentLine} ${position.accentLine}` : styles.micro} ${position.text}`}
      data-construction
      role={line.tone === "accent" ? "alert" : "status"}
    >
      {line.text}
    </p>
  );
}

// 5.2 and 5.3: what everyone sees until they connect.
function NotConnected({ connection, onConnect }: { connection: Connection; onConnect: () => void }) {
  return (
    <>
      <div className={position.section} data-construction>
        <p className={`${styles.body} ${position.text}`} data-construction>
          Your videos are stored on this Mac.
        </p>
        <p className={`${styles.bodyMuted} ${position.text}`} data-construction>
          Connect OneDrive to keep a copy safe in OneDrive, or to free up space on this Mac. Master&apos;s Wheel works fully without it.
        </p>
      </div>
      <div className={position.section} data-construction>
        <div className={position.actions} data-construction>
          <button
            type="button"
            className={`${styles.button} ${styles.primary} ${position.button}`}
            data-construction
            disabled={connection.waiting}
            onClick={onConnect}
          >
            {connection.waiting ? "Waiting for Microsoft sign-in…" : "Connect OneDrive"}
          </button>
          {connection.waiting && (
            <button type="button" className={`${styles.textButton} ${position.textButton}`} data-construction onClick={connection.cancel}>
              Cancel
            </button>
          )}
        </div>
        <Line line={connection.line} />
        <p className={`${styles.micro} ${position.text}`} data-construction>
          Works with personal Microsoft accounts. Only videos are uploaded. Notes, transcripts and scores stay on this Mac.
        </p>
      </div>
    </>
  );
}

// 5.4: the connected panel. Nothing to do here in normal use.
function Connected({ overview, connection, onSignIn }: { overview: StorageOverview; connection: Connection; onSignIn: () => void }) {
  const titleOf = useRecordTitles();
  const sheets = useSheets(overview);
  const notice = problemNotice(overview, titleOf);

  function handleNoticeAction(action: Exclude<NoticeAction, null>) {
    if (action === "signIn") onSignIn();
    else if (action === "manageStorage") sheets.attempt("manageStorage", openManageStorage);
    else sheets.attempt("retry", retryUnreadableVideos);
  }

  return (
    <>
      <AccountBlock account={overview.account} onShowInOneDrive={() => sheets.attempt("showInOneDrive", showFolderInOneDrive)} />
      {notice && <ProblemNotice notice={notice} busy={connection.waiting} onAction={handleNoticeAction} />}
      <Line line={connection.line} />
      <ModePicker mode={sheets.shownMode ?? overview.mode} onPick={sheets.pickMode} />
      <p className={`${styles.micro} ${position.text}`} data-construction aria-live="polite">
        {numbersLine(overview)}
      </p>
      <Line line={sheets.error} />
      <div className={position.bottom} data-construction>
        {overview.disconnecting ? (
          <button
            type="button"
            className={`${styles.textButton} ${position.textButton}`}
            data-construction
            onClick={() => sheets.attempt("stopDisconnecting", stopDisconnecting)}
          >
            Stop disconnecting
          </button>
        ) : (
          <button type="button" className={`${styles.textButton} ${position.textButton}`} data-construction onClick={sheets.askDisconnect}>
            Disconnect OneDrive…
          </button>
        )}
      </div>
      {sheets.sheet && <ConfirmSheet sheet={sheets.sheet} onConfirm={sheets.confirm} onCancel={sheets.cancel} />}
    </>
  );
}
