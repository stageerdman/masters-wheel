// The Spaces registry: ~/Documents/Master's Wheel/spaces.json. Ongoing
// CRUD stays plain TS/plugin-fs, matching every other storage module in
// this app — the one exception is the first-run migration of pre-existing
// data (agents/chats used to live under the hidden app-data dir), which is
// a Rust command (see src-tauri/src/spaces.rs) since it needs to move files
// outside this module's own fs capability scope and benefits from Rust's
// unrestricted access instead of widening that scope just for one-time use.

import { invoke } from "@tauri-apps/api/core";
import { exists, mkdir, readTextFile, remove, rename, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, registryPath, spaceAgentsDir, spaceChatsDir, spaceDir, spaceRecordsDir } from "./paths";
import type { Space, SpaceRegistry } from "./types";

const DEFAULT_ICON = "compass";

function parseRegistry(text: string): SpaceRegistry | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SpaceRegistry>;
  if (!Array.isArray(candidate.spaces) || typeof candidate.activeSpaceId !== "string") return null;
  const spaces = candidate.spaces.filter(
    (space): space is Space =>
      !!space &&
      typeof space === "object" &&
      typeof (space as Space).id === "string" &&
      typeof (space as Space).name === "string" &&
      typeof (space as Space).folderName === "string",
  );
  if (spaces.length === 0) return null;
  return { spaces, activeSpaceId: candidate.activeSpaceId };
}

async function readRegistry(): Promise<SpaceRegistry> {
  const text = await readTextFile(registryPath(), { baseDir: BASE_DIR });
  const registry = parseRegistry(text);
  if (!registry) throw new Error("Master's Wheel/spaces.json exists but is unreadable.");
  return registry;
}

async function writeRegistry(registry: SpaceRegistry): Promise<void> {
  await writeTextFile(registryPath(), JSON.stringify(registry, null, 2), { baseDir: BASE_DIR });
}

// Runs the one-time migration (no-op if already done — see spaces.rs),
// then returns the registry, guaranteed to exist and contain at least one
// Space from this point on.
export async function ensureInitialized(): Promise<SpaceRegistry> {
  // createdAt is supplied from here (not computed in Rust) so the Rust
  // side doesn't need a date/time crate for the one timestamp it would
  // otherwise have to format itself — ignored entirely if migration
  // already happened on an earlier launch.
  await invoke("migrate_legacy_data_to_default_space", { createdAt: new Date().toISOString() });
  return readRegistry();
}

// Read-only list of every Space that exists — used by agents/storage.ts to
// scan across every Space's agents/ folder now that an agent can be visible
// outside the one Space it physically lives in.
export async function listSpaces(): Promise<Space[]> {
  const registry = await readRegistry();
  return registry.spaces;
}

export function resolveActiveSpace(registry: SpaceRegistry): Space {
  const active = registry.spaces.find((space) => space.id === registry.activeSpaceId);
  // Guards against a hand-edited/corrupt activeSpaceId — falls back to the
  // first real Space rather than crashing, same tolerance every other
  // parser in this app gives corrupt-but-not-absent data.
  return active ?? registry.spaces[0];
}

function sanitizeFolderName(name: string): string {
  const cleaned = name.replace(/[/:]/g, "-").trim();
  return cleaned || "Space";
}

async function uniqueFolderName(baseName: string): Promise<string> {
  let candidate = baseName;
  let n = 2;
  while (await exists(spaceDir(candidate), { baseDir: BASE_DIR }).catch(() => false)) {
    candidate = `${baseName} (${n})`;
    n += 1;
  }
  return candidate;
}

// Creates a new, genuinely empty Space: its own agents/chats/records
// folders on disk, appended to the registry, and switched to immediately.
export async function createSpace(name: string, icon: string): Promise<SpaceRegistry> {
  const trimmedName = name.trim() || "Untitled Space";
  const folderName = await uniqueFolderName(sanitizeFolderName(trimmedName));

  await mkdir(spaceAgentsDir(folderName), { baseDir: BASE_DIR, recursive: true });
  await mkdir(spaceChatsDir(folderName), { baseDir: BASE_DIR, recursive: true });
  await mkdir(spaceRecordsDir(folderName), { baseDir: BASE_DIR, recursive: true });

  const space: Space = {
    id: crypto.randomUUID(),
    name: trimmedName,
    icon: icon || DEFAULT_ICON,
    createdAt: new Date().toISOString(),
    folderName,
  };

  const registry = await readRegistry();
  const next: SpaceRegistry = { spaces: [...registry.spaces, space], activeSpaceId: space.id };
  await writeRegistry(next);
  return next;
}

export async function switchSpace(id: string): Promise<SpaceRegistry> {
  const registry = await readRegistry();
  if (!registry.spaces.some((space) => space.id === id)) return registry;
  const next: SpaceRegistry = { ...registry, activeSpaceId: id };
  await writeRegistry(next);
  return next;
}

// Renames a Space and/or changes its icon. A name change that actually
// changes the sanitized folder name renames the real on-disk folder too
// (the folder name IS the display name, by design — see this update's
// wiki.md) via a real filesystem rename, same O(1)-on-the-same-volume
// move the first-run migration relies on, not a copy. Collision-checked
// the same way createSpace's uniqueFolderName is, since the target name
// might already belong to a different Space's folder.
export async function renameSpace(id: string, name: string, icon: string): Promise<SpaceRegistry> {
  const registry = await readRegistry();
  const target = registry.spaces.find((space) => space.id === id);
  if (!target) return registry;

  const trimmedName = name.trim() || target.name;
  const sanitized = sanitizeFolderName(trimmedName);
  let folderName = target.folderName;
  if (sanitized !== target.folderName) {
    folderName = await uniqueFolderName(sanitized);
    await rename(spaceDir(target.folderName), spaceDir(folderName), { oldPathBaseDir: BASE_DIR, newPathBaseDir: BASE_DIR });
  }

  const updated: Space = { ...target, name: trimmedName, icon: icon || target.icon, folderName };
  const nextSpaces = registry.spaces.map((space) => (space.id === id ? updated : space));
  const next: SpaceRegistry = { ...registry, spaces: nextSpaces };
  await writeRegistry(next);
  return next;
}

// Deletes a Space entirely — its whole folder (agents/chats/records, all
// of it), irreversible. The caller is responsible for confirming with the
// user first (see this update's plan: typing "delete" to confirm). Refuses
// to delete the last remaining Space — there always has to be at least
// one. Deleting the active Space switches to another remaining one first.
export async function deleteSpace(id: string): Promise<SpaceRegistry> {
  const registry = await readRegistry();
  if (registry.spaces.length <= 1) {
    throw new Error("Can't delete the last remaining Space.");
  }
  const target = registry.spaces.find((space) => space.id === id);
  if (!target) return registry;

  const remainingSpaces = registry.spaces.filter((space) => space.id !== id);
  const activeSpaceId = registry.activeSpaceId === id ? remainingSpaces[0].id : registry.activeSpaceId;

  await remove(spaceDir(target.folderName), { baseDir: BASE_DIR, recursive: true });

  const next: SpaceRegistry = { spaces: remainingSpaces, activeSpaceId };
  await writeRegistry(next);
  return next;
}
