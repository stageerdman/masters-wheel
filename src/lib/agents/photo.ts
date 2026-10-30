// Turns an agent's photo into a persistable `data:` URL. Picking is a
// plain native file dialog (same pattern as knowledgeFiles.ts); the
// actual decode/resize/encode happens on the Rust side (see
// src-tauri/src/avatar.rs), so the stored result is a small,
// self-contained string — never a `blob:` URL, which only lives as long
// as the webview session that created it (why a previously-uploaded
// photo turned into a broken image after restarting the app).

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.includes(extension);
}

// Opens the native "choose a photo" dialog; returns null if the user
// cancels.
export async function pickAgentPhoto(): Promise<string | null> {
  const selection = await open({ multiple: false, filters: [{ name: "Image", extensions: IMAGE_EXTENSIONS }] });
  return typeof selection === "string" ? selection : null;
}

export async function readImageAsDataUrl(path: string): Promise<string> {
  return invoke<string>("read_image_as_data_url", { path });
}
