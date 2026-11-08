// Per-Space settings — plain TS, no React, same tolerant-parse shape as
// src/lib/training and src/lib/records. One `settings.json` directly under
// the Space's own folder (sibling to agents/chats/records/training), since
// there's exactly one of these per Space, not a collection of folders.

import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceDir } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";

const SETTINGS_FILE_NAME = "settings.json";

function settingsPath(): string {
  return `${spaceDir(getActiveSpaceFolder())}/${SETTINGS_FILE_NAME}`;
}

export type SpaceSettings = {
  businessDescription: string;
};

function defaultSettings(): SpaceSettings {
  return { businessDescription: "" };
}

function parseSettings(text: string): SpaceSettings | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SpaceSettings>;
  return {
    businessDescription: typeof candidate.businessDescription === "string" ? candidate.businessDescription : "",
  };
}

// Missing or corrupt settings.json is just the defaults, not a crash — same
// tolerance as every other per-Space storage module's parseMeta.
export async function readSettings(): Promise<SpaceSettings> {
  try {
    const text = await readTextFile(settingsPath(), { baseDir: BASE_DIR });
    return parseSettings(text) ?? defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export async function writeSettings(partial: Partial<SpaceSettings>): Promise<void> {
  const current = await readSettings();
  const next: SpaceSettings = { ...current, ...partial };
  await mkdir(spaceDir(getActiveSpaceFolder()), { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(settingsPath(), JSON.stringify(next, null, 2), { baseDir: BASE_DIR });
}
