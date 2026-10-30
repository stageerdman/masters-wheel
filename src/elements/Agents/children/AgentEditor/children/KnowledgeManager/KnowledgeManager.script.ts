import { useState } from "react";
import type { KnowledgeFile } from "@/elements/Agents/Agents.data";
import { ingestKnowledgeFile, pickKnowledgeFiles } from "@/lib/agents";

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKindLabel(extension: string) {
  const normalized = extension.toLowerCase();
  if (normalized === "pdf") return "PDF";
  if (normalized === "md" || normalized === "markdown") return "Markdown";
  if (normalized === "txt") return "Text";
  return "File";
}

// Owns the whole "add knowledge files" flow: opening the native file
// picker, then indexing each selected file one at a time (extract, chunk,
// embed, store — see src-tauri/src/knowledge/). This can take a few
// seconds per file, longer on the very first call ever made (which also
// downloads the local embedding model) — isIndexing drives the button's
// loading state for that wait. One file failing (e.g. an unsupported
// type) doesn't abort the rest of the batch.
export function useKnowledgeUpload(agentId: string, onAdded: (file: KnowledgeFile) => void) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles() {
    const paths = await pickKnowledgeFiles();
    if (paths.length === 0) return;
    setIsIndexing(true);
    setError(null);
    for (const path of paths) {
      try {
        onAdded(await ingestKnowledgeFile(agentId, path));
      } catch (e) {
        setError(String(e));
      }
    }
    setIsIndexing(false);
  }

  return { isIndexing, error, addFiles };
}
