// Tiny cross-module store — same shape as src/lib/mcp/activeRecord.ts.
// Exists so plain storage modules (agents/storage.ts, chat/storage.ts,
// records/index.ts — none of them React, all of them called from many
// different components) can know which Space's folder to read/write
// without every call site threading a `spaceFolder` argument through by
// hand. SpacesProvider is the only writer: it calls setActiveSpace once
// after the registry loads, and again every time the user switches.

"use client";

import { useSyncExternalStore } from "react";
import type { Space } from "./types";

type Listener = () => void;

let current: Space | null = null;
const listeners = new Set<Listener>();

export function setActiveSpace(space: Space): void {
  if (space.id === current?.id && space.folderName === current?.folderName) return;
  current = space;
  for (const listener of listeners) listener();
}

// Storage modules call this synchronously when building a path. Throws
// rather than silently falling back to some default — reading/writing
// agent/chat/record data before a Space is known would silently scope it
// to the wrong place, which is worse than a loud crash during development.
export function getActiveSpaceFolder(): string {
  return getActiveSpace().folderName;
}

// Same guard as getActiveSpaceFolder, but returns the whole Space — agents
// storage needs both the id (to check availableSpaceIds) and the folder
// name (to build a path) for the active Space.
export function getActiveSpace(): Space {
  if (!current) {
    throw new Error("No active Space set yet — storage was called before SpacesProvider finished initializing.");
  }
  return current;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Space | null {
  return current;
}

export function useActiveSpace(): Space | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
