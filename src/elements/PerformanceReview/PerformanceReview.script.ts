"use client";

// Data loading/saving for Performance Review: bridges the real on-disk
// records (src/lib/records) to the VideoRecord shape the UI renders, with
// debounced writes so typing doesn't hit disk on every keystroke. Also
// wires Tauri's native window-level drag-and-drop (real filesystem paths,
// unlike a sandboxed HTML5 drop) so dropping a file anywhere on this page
// creates a record. See this update's wiki.md for why.

import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  createRecordFromFile,
  heroStreamUrl,
  importTranscriptFile,
  listRecords,
  readDoc,
  readTranscript,
  writeDoc,
  writeMeta,
  writeTranscript,
  type RecordMetaFields,
  type RecordSummary,
} from "@/lib/records";
import { parseTranscript, renameSpeaker, serializeTranscript } from "@/lib/transcript";
import { type CallState, type VideoRecord } from "./PerformanceReview.data";

const WRITE_DEBOUNCE_MS = 400;

type DocPair = { notes: string; aiAnalysis: string };

function isCallState(value: string | null): value is CallState {
  return (
    value === "closed" ||
    value === "training" ||
    value === "postponed" ||
    value === "failed" ||
    value === "notQualified"
  );
}

export function usePerformanceReviewData() {
  const [summaries, setSummaries] = useState<RecordSummary[]>([]);
  const [docs, setDocs] = useState<Record<string, DocPair>>({});
  const [lessons, setLessons] = useState<Record<string, string>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string | null>>({});
  const [isTranscriptUploadOpen, setIsTranscriptUploadOpen] = useState(false);
  const [transcriptUploadError, setTranscriptUploadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const docTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const metaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingMeta = useRef<Record<string, Partial<RecordMetaFields>>>({});

  // Initial load. Outside the Tauri shell (e.g. the plain browser tab used
  // for HMR preview) there's no fs bridge at all — just stay empty rather
  // than throwing.
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    listRecords()
      .then((loaded) => {
        if (cancelled) return;
        setSummaries(loaded);
        setSelectedId((current) => current ?? loaded[0]?.id ?? null);
      })
      .catch((error) => console.error("Failed to load records:", error));
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazily load notes/AI-analysis for the selected record, once, caching
  // the result so flipping between records doesn't re-read from disk.
  useEffect(() => {
    if (!selectedId || !isTauri() || docs[selectedId]) return;
    let cancelled = false;
    Promise.all([readDoc(selectedId, "notes"), readDoc(selectedId, "analysis")])
      .then(([notes, aiAnalysis]) => {
        if (cancelled) return;
        setDocs((prev) => ({ ...prev, [selectedId]: { notes, aiAnalysis } }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, docs]);

  // Lazily load the selected record's transcript.md, once, caching the
  // result (including the null "no transcript yet" case) the same way the
  // notes/AI-analysis docs are cached above.
  useEffect(() => {
    if (!selectedId || !isTauri() || selectedId in transcripts) return;
    let cancelled = false;
    readTranscript(selectedId)
      .then((raw) => {
        if (cancelled) return;
        setTranscripts((prev) => ({ ...prev, [selectedId]: raw }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, transcripts]);

  // Tracks how many times each record has been opened — fires once per
  // actual selection change (including the initial auto-selection on
  // load), not on every render. `summaries` is read fresh from the
  // closure rather than listed as a dependency, since updating it here
  // would otherwise retrigger this same effect.
  useEffect(() => {
    if (!selectedId || !isTauri()) return;
    // Deferred a tick (same pattern as the initial-load effect above) so
    // the state update isn't synchronous within the effect body.
    Promise.resolve().then(() => {
      const current = summaries.find((item) => item.id === selectedId);
      if (!current) return;
      const nextCount = current.openCount + 1;
      setSummaries((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, openCount: nextCount } : item))
      );
      scheduleMetaWrite(selectedId, { openCount: nextCount });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // The selected record's hero file, as a URL onto the local media server
  // (see src/lib/records' heroStreamUrl) — a synchronous string build, no
  // async resolution needed since it no longer depends on documentDir().
  const selectedSummary = summaries.find((item) => item.id === selectedId);
  const heroSrc =
    selectedSummary?.heroFileName && isTauri()
      ? heroStreamUrl(selectedSummary.id, selectedSummary.heroFileName)
      : null;

  const videos: VideoRecord[] = summaries.map((summary) => ({
    id: summary.id,
    state: isCallState(summary.state) ? summary.state : null,
    date: summary.date,
    closedDate: summary.closedDate,
    title: summary.title,
    transcriptRaw: transcripts[summary.id] ?? null,
    notes: docs[summary.id]?.notes ?? "",
    aiAnalysis: docs[summary.id]?.aiAnalysis ?? "",
    lessons: lessons[summary.id] ?? "",
    offeredAmount: summary.offeredAmount,
    offeredCurrency: summary.offeredCurrency,
    description: summary.description,
    reviewed: summary.reviewed,
    openCount: summary.openCount,
  }));

  const selected = videos.find((video) => video.id === selectedId) ?? null;

  function scheduleDocWrite(id: string, kind: "notes" | "analysis", text: string) {
    const key = `${id}:${kind}`;
    clearTimeout(docTimers.current[key]);
    docTimers.current[key] = setTimeout(() => {
      writeDoc(id, kind, text).catch((error) => console.error("Failed to write record doc:", id, kind, error));
    }, WRITE_DEBOUNCE_MS);
  }

  // Merges into any already-pending partial for this record rather than
  // replacing it — two fields changed back-to-back (e.g. state +
  // closedDate when marking a call closed) must both survive, not have
  // the second clearTimeout silently drop the first field's write.
  function scheduleMetaWrite(id: string, partial: Partial<RecordMetaFields>) {
    pendingMeta.current[id] = { ...pendingMeta.current[id], ...partial };
    clearTimeout(metaTimers.current[id]);
    metaTimers.current[id] = setTimeout(() => {
      const toWrite = pendingMeta.current[id];
      delete pendingMeta.current[id];
      writeMeta(id, toWrite).catch((error) => console.error("Failed to write record meta:", id, error));
    }, WRITE_DEBOUNCE_MS);
  }

  const onNotesChange = useCallback(
    (value: string) => {
      if (!selectedId) return;
      setDocs((prev) => ({ ...prev, [selectedId]: { aiAnalysis: prev[selectedId]?.aiAnalysis ?? "", notes: value } }));
      scheduleDocWrite(selectedId, "notes", value);
    },
    [selectedId]
  );

  const onAiAnalysisChange = useCallback(
    (value: string) => {
      if (!selectedId) return;
      setDocs((prev) => ({ ...prev, [selectedId]: { notes: prev[selectedId]?.notes ?? "", aiAnalysis: value } }));
      scheduleDocWrite(selectedId, "analysis", value);
    },
    [selectedId]
  );

  const onLessonsChange = useCallback(
    (value: string) => {
      if (!selectedId) return;
      setLessons((prev) => ({ ...prev, [selectedId]: value }));
    },
    [selectedId]
  );

  function updateMetaField<K extends keyof RecordMetaFields>(key: K, value: RecordMetaFields[K]) {
    if (!selectedId) return;
    setSummaries((prev) => prev.map((item) => (item.id === selectedId ? { ...item, [key]: value } : item)));
    scheduleMetaWrite(selectedId, { [key]: value } as Partial<RecordMetaFields>);
  }

  function toggleReviewed() {
    if (!selectedId) return;
    const current = summaries.find((item) => item.id === selectedId);
    updateMetaField("reviewed", !(current?.reviewed ?? false));
  }

  function openTranscriptUpload() {
    setTranscriptUploadError(null);
    setIsTranscriptUploadOpen(true);
  }

  function closeTranscriptUpload() {
    setIsTranscriptUploadOpen(false);
    setTranscriptUploadError(null);
  }

  // Imports a transcript file for the selected record: copies it in,
  // parses it (recognizing whichever known format it matches — see
  // src/lib/transcript), then re-serializes it to the canonical on-disk
  // shape so timestamps always end up standardized regardless of which
  // tool produced the source file. An unrecognized file surfaces an error
  // in the upload modal instead of silently keeping a bad transcript.md.
  const importTranscript = useCallback(
    async (sourcePath: string) => {
      if (!selectedId) return;
      const id = selectedId;
      try {
        const raw = await importTranscriptFile(id, sourcePath);
        const parsed = parseTranscript(raw);
        if (!parsed) {
          setTranscriptUploadError("That file doesn't look like a supported transcript yet.");
          return;
        }
        const canonical = serializeTranscript(parsed);
        await writeTranscript(id, canonical);
        setTranscripts((prev) => ({ ...prev, [id]: canonical }));
        setIsTranscriptUploadOpen(false);
        setTranscriptUploadError(null);
      } catch (error) {
        console.error("Failed to import transcript:", id, error);
        setTranscriptUploadError("Couldn't read that file.");
      }
    },
    [selectedId]
  );

  // Renames every line spoken by `from` to `to`, in both the UI and the
  // transcript.md source file.
  const renameTranscriptSpeaker = useCallback(
    (from: string, to: string) => {
      if (!selectedId || !to.trim() || from === to) return;
      const id = selectedId;
      const current = transcripts[id];
      if (!current) return;
      const parsed = parseTranscript(current);
      if (!parsed) return;
      const canonical = serializeTranscript(renameSpeaker(parsed, from, to.trim()));
      setTranscripts((prev) => ({ ...prev, [id]: canonical }));
      writeTranscript(id, canonical).catch((error) =>
        console.error("Failed to write renamed transcript:", id, error)
      );
    },
    [selectedId, transcripts]
  );

  // Creates one record per given path (dialog selection or drag-drop),
  // skipping any that fail rather than aborting the whole batch, then
  // selects the first newly created one.
  const addRecordsFromPaths = useCallback(async (paths: string[]) => {
    const created: RecordSummary[] = [];
    for (const path of paths) {
      try {
        created.push(await createRecordFromFile(path));
      } catch (error) {
        console.error("Failed to import file:", path, error);
      }
    }
    if (created.length === 0) return;
    setSummaries((prev) => [...prev, ...created]);
    setSelectedId(created[0].id);
  }, []);

  return {
    videos,
    selected,
    selectedId,
    setSelectedId,
    heroSrc,
    onNotesChange,
    onAiAnalysisChange,
    onLessonsChange,
    updateMetaField,
    toggleReviewed,
    addRecordsFromPaths,
    isTranscriptUploadOpen,
    transcriptUploadError,
    openTranscriptUpload,
    closeTranscriptUpload,
    importTranscript,
    renameTranscriptSpeaker,
  };
}

// Registers Tauri's native window-level drag-and-drop while the caller is
// mounted. A sandboxed HTML5 `drop` handler only hands back `File` blobs,
// not a real filesystem path — `onDragDropEvent` gives the real path we
// need to copy the file into the record's folder. Also tracks enter/leave
// so the caller can show a drop-zone highlight while something's hovering.
// `enabled` lets a caller temporarily disable this listener entirely — the
// transcript upload modal needs to own window-level drops while it's open
// instead of having them misread as "add a new video record" (see
// useTranscriptDrop below, and CLAUDE.md's note on the two drop targets).
export function useRecordDrop(onFilesDropped: (paths: string[]) => void, enabled: boolean = true) {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    if (!isTauri() || !enabled) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
        } else if (event.payload.type === "drop") {
          setIsDragActive(false);
          onFilesDropped(event.payload.paths);
        } else if (event.payload.type === "leave") {
          setIsDragActive(false);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((error) => console.error("Failed to register drag-and-drop listener:", error));
    return () => {
      cancelled = true;
      unlisten?.();
      setIsDragActive(false);
    };
  }, [onFilesDropped, enabled]);

  return isDragActive;
}

// Same window-level drag-drop primitive as useRecordDrop, but only active
// while the transcript upload modal is open, and only ever hands back the
// first dropped path (a transcript import is always one file). The two
// hooks are mutually exclusive by construction: PerformanceReview.tsx
// passes `enabled: !isTranscriptUploadOpen` to useRecordDrop and
// `enabled: isTranscriptUploadOpen` here, so a drop is never claimed by
// both at once.
export function useTranscriptDrop(onFileDropped: (path: string) => void, enabled: boolean) {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    if (!isTauri() || !enabled) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
        } else if (event.payload.type === "drop") {
          setIsDragActive(false);
          if (event.payload.paths[0]) onFileDropped(event.payload.paths[0]);
        } else if (event.payload.type === "leave") {
          setIsDragActive(false);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((error) => console.error("Failed to register transcript drag-and-drop listener:", error));
    return () => {
      cancelled = true;
      unlisten?.();
      setIsDragActive(false);
    };
  }, [onFileDropped, enabled]);

  return isDragActive;
}
