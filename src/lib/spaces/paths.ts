// The one place every per-Space storage path is built from — Agents, chat
// sessions, and Performance Review records all live together under one
// real, Finder-visible folder per Space (see this update's wiki.md for why:
// the user explicitly wants Spaces to be real folders, not something split
// across a hidden app-data dir and ~/Documents). Before this module existed,
// the Performance Review root alone was hardcoded in three separate places
// that had to be kept in sync by hand — this is the fix for that.
//
//   ~/Documents/Master's Wheel/spaces.json        <- registry (this module)
//   ~/Documents/Master's Wheel/<folderName>/agents/<id>/...
//   ~/Documents/Master's Wheel/<folderName>/chats/<id>.json
//   ~/Documents/Master's Wheel/<folderName>/records/<id>/...
//   ~/Documents/Master's Wheel/<folderName>/training/<id>/...

import { BaseDirectory } from "@tauri-apps/plugin-fs";

export const STORAGE_DIR_NAME = "Master's Wheel";
export const BASE_DIR = BaseDirectory.Document;
export const REGISTRY_FILE_NAME = "spaces.json";

export function registryPath(): string {
  return `${STORAGE_DIR_NAME}/${REGISTRY_FILE_NAME}`;
}

export function spaceDir(folderName: string): string {
  return `${STORAGE_DIR_NAME}/${folderName}`;
}

export function spaceAgentsDir(folderName: string): string {
  return `${spaceDir(folderName)}/agents`;
}

export function spaceChatsDir(folderName: string): string {
  return `${spaceDir(folderName)}/chats`;
}

export function spaceRecordsDir(folderName: string): string {
  return `${spaceDir(folderName)}/records`;
}

export function spaceTrainingDir(folderName: string): string {
  return `${spaceDir(folderName)}/training`;
}
