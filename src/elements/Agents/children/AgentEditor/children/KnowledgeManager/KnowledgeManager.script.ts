import { useCallback, useState } from "react";
import type { KnowledgeFile } from "@/elements/Agents/Agents.data";
import { basenameOf, ingestKnowledgeFile, isKnowledgeFilePath, onKnowledgeIngestProgress, pickKnowledgeFiles } from "@/lib/agents";

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

export type IndexingStatus = { fileName: string; processed: number; total: number };

// Owns the whole "add knowledge files" flow, from however the files were
// selected (native dialog or a window drop — see
// KnowledgeManager.tsx/useWindowFileDrop) through indexing each one. Files
// are indexed one at a time, not in parallel, so `indexing` always
// describes exactly one real in-progress file rather than needing to
// track a list. One file failing (e.g. an unsupported type) doesn't abort
// the rest of the batch.
export function useKnowledgeUpload(agentId: string, onAdded: (file: KnowledgeFile) => void) {
  const [indexing, setIndexing] = useState<IndexingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ingestOne = useCallback(
    async (path: string) => {
      const fileName = basenameOf(path);
      const jobId = crypto.randomUUID();
      setIndexing({ fileName, processed: 0, total: 0 });

      const unlisten = await onKnowledgeIngestProgress((progress) => {
        if (progress.jobId !== jobId) return;
        setIndexing({ fileName, processed: progress.processed, total: progress.total });
      });

      try {
        onAdded(await ingestKnowledgeFile(agentId, path, jobId));
      } catch (e) {
        setError(String(e));
      } finally {
        unlisten();
      }
    },
    [agentId, onAdded],
  );

  // Stable across renders (as long as agentId/onAdded are) so a consumer
  // using this as a `useWindowFileDrop` callback doesn't tear down and
  // re-register the native drag listener on every render. Filters to
  // this feature's own supported extensions — IdentityHeader's photo
  // drop zone listens on the same window-wide drop event, so a dropped
  // image needs to be silently ignored here rather than surfacing an
  // "unsupported file type" error for a file that was never meant for
  // this drop target in the first place.
  const addFiles = useCallback(
    async (paths: string[]) => {
      const relevant = paths.filter(isKnowledgeFilePath);
      if (relevant.length === 0) return;
      setError(null);
      for (const path of relevant) {
        await ingestOne(path);
      }
      setIndexing(null);
    },
    [ingestOne],
  );

  const pickAndAddFiles = useCallback(async () => {
    addFiles(await pickKnowledgeFiles());
  }, [addFiles]);

  return { indexing, error, addFiles, pickAndAddFiles };
}
