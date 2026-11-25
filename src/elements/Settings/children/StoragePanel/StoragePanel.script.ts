"use client";

import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  cancelConnectOneDrive,
  connectOneDrive,
  disconnectSheet,
  disconnectStorage,
  ensureAppFolder,
  errorKind,
  errorMessage,
  previewDisconnect,
  previewStorageSwitch,
  setStorageMode,
  switchSheet,
  type CommandErrorKind,
  type Sheet,
  type StorageMode,
  type StorageOverview,
} from "@/lib/onedrive";
import { listRecords } from "@/lib/records";

export type PanelLine = { text: string; tone: "muted" | "accent" };

// The line under Connect after a sign-in that didn't succeed (SPEC 5.3).
const CONNECT_LINES: Record<CommandErrorKind, PanelLine> = {
  cancelled: { text: "Not connected. Your videos stay on this Mac, as before.", tone: "muted" },
  orgBlocked: {
    text: "Your organization doesn't allow Master's Wheel to use OneDrive. Ask your IT team, or connect with another account.",
    tone: "accent",
  },
  offline: { text: "You're offline. Connect to the internet, then try again.", tone: "muted" },
  other: { text: "Couldn't connect to OneDrive. Please try again.", tone: "accent" },
};

function connectLine(error: unknown): PanelLine {
  return CONNECT_LINES[errorKind(error)];
}

const ACTION_FAILED: PanelLine = { text: "That didn't work. Please try again.", tone: "accent" };

function logError(where: string, error: unknown) {
  console.error(`[storage] StoragePanel.${where}:`, errorMessage(error));
}

// Connect and "Sign in again" share the browser flow (5.3). Resolves true
// on success so the panel can move focus to its heading.
export function useConnect() {
  const [waiting, setWaiting] = useState(false);
  const [line, setLine] = useState<PanelLine | null>(null);

  async function connect(): Promise<boolean> {
    setLine(null);
    if (!navigator.onLine) {
      setLine(CONNECT_LINES.offline);
      return false;
    }
    setWaiting(true);
    try {
      await connectOneDrive();
    } catch (error) {
      logError("connect", error);
      setLine(connectLine(error));
      return false;
    } finally {
      setWaiting(false);
    }
    // The folders and manifest help people browsing OneDrive; uploads
    // create what they need, so a failure here doesn't undo the connect.
    ensureAppFolder().catch((error) => logError("ensureAppFolder", error));
    return true;
  }

  const cancel = () => cancelConnectOneDrive().catch((error) => logError("cancelConnect", error));

  return { waiting, line, connect, cancel };
}

// Record id → title, for naming videos in the problem notice.
export function useRecordTitles(): (recordId: string) => string | undefined {
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!isTauri()) return;
    listRecords()
      .then((records) => setTitles(new Map(records.map((r) => [r.id, r.title]))))
      .catch((error) => logError("listRecords", error));
  }, []);
  return (recordId) => titles.get(recordId);
}

type OpenSheet = Sheet & ({ for: "switch"; mode: StorageMode } | { for: "disconnect"; downloadFirst: boolean });

// Mode switch (5.5) and disconnect (5.7): ask the engine what would move,
// confirm only when something does.
export function useSheets(overview: StorageOverview | null) {
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [error, setError] = useState<PanelLine | null>(null);

  async function attempt(where: string, task: () => Promise<void>) {
    setError(null);
    try {
      await task();
    } catch (e) {
      logError(where, e);
      setError(ACTION_FAILED);
    }
  }

  const pickMode = (mode: StorageMode) =>
    attempt("pickMode", async () => {
      if (!overview || mode === overview.mode) return;
      const preview = await previewStorageSwitch(mode);
      const next = switchSheet(overview.mode, mode, preview, overview.online);
      if (next) setSheet({ ...next, for: "switch", mode });
      else await setStorageMode(mode);
    });

  const askDisconnect = () =>
    attempt("askDisconnect", async () => {
      if (!overview) return;
      const preview = await previewDisconnect();
      const next = disconnectSheet(overview, preview);
      setSheet({ ...next, for: "disconnect", downloadFirst: preview.toMac > 0 && !next.confirmIsQuiet });
    });

  const confirm = () =>
    attempt("confirm", async () => {
      if (!sheet) return;
      setSheet(null);
      if (sheet.for === "switch") await setStorageMode(sheet.mode);
      else await disconnectStorage(sheet.downloadFirst);
    });

  // While the switch sheet is open the radio shows the choice; Cancel puts
  // it back on the current mode.
  const shownMode = sheet?.for === "switch" ? sheet.mode : overview?.mode;

  return { sheet, error, shownMode, pickMode, askDisconnect, confirm, cancel: () => setSheet(null), attempt };
}
