"use client";

import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { STORAGE_CHANGED_EVENT, getStorageOverview, type StorageOverview } from "./storage";

// The engine's overview, re-read whenever the engine reports a change.
// null until the first read (and always outside the Mac app).
export function useStorageOverview(): { overview: StorageOverview | null; refresh: () => void } {
  const [overview, setOverview] = useState<StorageOverview | null>(null);

  const refresh = useCallback(() => {
    getStorageOverview()
      .then(setOverview)
      .catch((error) => console.error("[storage] useStorageOverview: couldn't read the overview:", error));
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    refresh();
    const stop = listen(STORAGE_CHANGED_EVENT, refresh);
    return () => {
      stop.then((unlisten) => unlisten());
    };
  }, [refresh]);

  return { overview, refresh };
}
