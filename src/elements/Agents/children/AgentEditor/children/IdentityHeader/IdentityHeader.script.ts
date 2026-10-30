import { useState } from "react";
import { isImagePath, pickAgentPhoto, readImageAsDataUrl } from "@/lib/agents";

// Owns the whole "set this agent's photo" flow, from however the image
// was selected (native dialog or a window drop — see
// IdentityHeader.tsx/useWindowFileDrop) through turning it into a
// persistable data: URL (decode/resize/encode happens on the Rust side,
// see src-tauri/src/avatar.rs). Dropped paths that aren't images are
// ignored here — they're meant for the Knowledge drop zone elsewhere on
// this same page, not the photo.
export function usePhotoUpload(onPhotoChange: (url: string | null) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setFromPath(path: string) {
    setIsUploading(true);
    setError(null);
    try {
      onPhotoChange(await readImageAsDataUrl(path));
    } catch (e) {
      setError(String(e));
    } finally {
      setIsUploading(false);
    }
  }

  async function pickPhoto() {
    const path = await pickAgentPhoto();
    if (path) await setFromPath(path);
  }

  function handleDroppedPaths(paths: string[]) {
    const imagePath = paths.find(isImagePath);
    if (imagePath) void setFromPath(imagePath);
  }

  return { isUploading, error, pickPhoto, handleDroppedPaths };
}
