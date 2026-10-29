import { FAKE_CONTEXT_CAP_BYTES, type KnowledgeFile } from "@/elements/Agents/Agents.data";

export function filesToKnowledgeFiles(fileList: FileList): KnowledgeFile[] {
  return Array.from(fileList).map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  }));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Percentage against a fixed fake "context window" cap — there's no real
// model/backend here, see Agents.data.ts. Clamped to 100% for display even
// if one huge file alone would exceed it.
export function contextPercent(files: KnowledgeFile[]) {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  return Math.min(100, Math.round((total / FAKE_CONTEXT_CAP_BYTES) * 100));
}

export function fileKindLabel(type: string) {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "Sheet";
  if (type.startsWith("image/")) return "Image";
  return "File";
}
