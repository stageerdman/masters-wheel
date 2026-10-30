"use client";

import { useEffect, useState } from "react";
import { detectAudioTracks, type TrackSelection } from "@/lib/transcript/generate";

export type TrackRow = { index: number; name: string; keep: boolean };

type Status = "detecting" | "selecting" | "error";

// Drives just the detect/pick half of Generate Transcript: detect audio
// tracks, then (2+ tracks) let the user keep/name them. The actual cloud
// transcription doesn't happen here — it can run long and must never block
// the UI, so once the user confirms, `onStart` hands the picked tracks off
// to the caller (PerformanceReview.script.ts), which runs it as a
// background job shown inline in the transcript tab (see
// Transcript/children/TranscriptGenerating). A single detected track
// skips the picker entirely and starts right away, mirroring
// ~/dev/transcriber's own single-track-skips-multi-speaker-UI behavior.
export function useGenerateTranscript(
  isOpen: boolean,
  sourcePath: string | null,
  onStart: (sourcePath: string, selections: TrackSelection[]) => void
) {
  const [status, setStatus] = useState<Status>("detecting");
  const [rows, setRows] = useState<TrackRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runDetect(path: string) {
    setStatus("detecting");
    setError(null);
    try {
      const tracks = await detectAudioTracks(path);
      if (tracks.length === 0) {
        setStatus("error");
        setError("Couldn't detect any audio in this file.");
        return;
      }
      if (tracks.length === 1) {
        const [only] = tracks;
        onStart(path, [{ index: only.index, name: only.title ?? "Speaker 1" }]);
        return;
      }
      setRows(
        tracks.map((track, index) => ({
          index: track.index,
          name: track.title ?? `Speaker ${index + 1}`,
          keep: true,
        }))
      );
      setStatus("selecting");
    } catch (e) {
      setStatus("error");
      setError(String(e));
    }
  }

  // Kicks off detection whenever the modal opens (or is reopened against a
  // different record) — a one-shot reaction to that transition, not a
  // sync loop, same justification as the hydration effects in
  // Hero.script.ts / Detail.script.ts.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    if (!sourcePath) {
      setStatus("error");
      setError("This record has no video yet — add one first.");
      return;
    }
    void runDetect(sourcePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourcePath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    status,
    rows,
    error,
    updateName(index: number, name: string) {
      setRows((prev) => prev.map((row) => (row.index === index ? { ...row, name } : row)));
    },
    toggleKeep(index: number) {
      setRows((prev) => prev.map((row) => (row.index === index ? { ...row, keep: !row.keep } : row)));
    },
    confirm() {
      if (!sourcePath) return;
      const selections = rows
        .filter((row) => row.keep)
        .map((row) => ({ index: row.index, name: row.name.trim() || "Speaker" }));
      if (selections.length === 0) return;
      onStart(sourcePath, selections);
    },
    retry() {
      if (sourcePath) void runDetect(sourcePath);
    },
  };
}
