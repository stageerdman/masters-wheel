"use client";

// Mounted once in layout.tsx, above everything else (including AIAssistant,
// which is a route-independent global singleton) — same shape as
// AppHeader.context.tsx. Gates rendering its children until the registry
// has loaded and activeSpaceStore has a real value, so no storage module
// anywhere in the app (agents/chat/records) can ever read/write before a
// Space is known. A cold desktop-app launch reading one small local JSON
// file is imperceptibly fast — not worth a loading UI for.

import { invoke } from "@tauri-apps/api/core";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActiveSpace, useActiveSpace } from "./activeSpaceStore";
import { createSpace as createSpaceOnDisk, deleteSpace as deleteSpaceOnDisk, ensureInitialized, resolveActiveSpace, switchSpace as switchSpaceOnDisk } from "./registry";
import type { Space } from "./types";

type SpacesContextValue = {
  spaces: Space[];
  activeSpace: Space;
  switchSpace: (id: string) => Promise<void>;
  createSpace: (name: string, icon: string) => Promise<Space>;
  deleteSpace: (id: string) => Promise<void>;
};

const SpacesContext = createContext<SpacesContextValue | null>(null);

// Tells the Rust-owned media server (see media_server.rs) which Space's
// records to stream from — the one piece of per-Space state that lives on
// the Rust side and can't just read activeSpaceStore itself.
function notifyMediaServer(space: Space): void {
  void invoke("switch_space_media_root", { spaceFolder: space.folderName });
}

export function SpacesProvider({ children }: { children: ReactNode }) {
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const activeSpace = useActiveSpace();

  useEffect(() => {
    let cancelled = false;
    ensureInitialized().then((registry) => {
      if (cancelled) return;
      const active = resolveActiveSpace(registry);
      setActiveSpace(active);
      notifyMediaServer(active);
      setSpaces(registry.spaces);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SpacesContextValue | null>(() => {
    if (!spaces || !activeSpace) return null;
    return {
      spaces,
      activeSpace,
      async switchSpace(id) {
        const registry = await switchSpaceOnDisk(id);
        const active = resolveActiveSpace(registry);
        setActiveSpace(active);
        notifyMediaServer(active);
        setSpaces(registry.spaces);
      },
      async createSpace(name, icon) {
        const registry = await createSpaceOnDisk(name, icon);
        const active = resolveActiveSpace(registry);
        setActiveSpace(active);
        notifyMediaServer(active);
        setSpaces(registry.spaces);
        return active;
      },
      async deleteSpace(id) {
        const registry = await deleteSpaceOnDisk(id);
        const active = resolveActiveSpace(registry);
        setActiveSpace(active);
        notifyMediaServer(active);
        setSpaces(registry.spaces);
      },
    };
  }, [spaces, activeSpace]);

  if (!value) return null;
  return <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>;
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error("useSpaces must be used within SpacesProvider");
  }
  return context;
}
