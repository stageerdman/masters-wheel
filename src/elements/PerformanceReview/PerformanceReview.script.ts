"use client";

// Data loading/saving for Performance Review: bridges the real on-disk
// records (src/lib/records) to the VideoRecord shape the UI renders, with
// debounced writes so typing doesn't hit disk on every keystroke. Also
// wires Tauri's native window-level drag-and-drop (real filesystem paths,
// unlike a sandboxed HTML5 drop) so dropping a file anywhere on this page
// creates a record. See this update's wiki.md for why.

import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  createRecordFromFile,
  listRecords,
  readDoc,
  resolveHeroPath,
  writeDoc,
  writeMeta,
  type RecordMetaFields,
  type RecordSummary,
} from "@/lib/records";
import { type CallState, type VideoRecord } from "./PerformanceReview.data";

const WRITE_DEBOUNCE_MS = 400;

type DocPair = { notes: string; aiAnalysis: string };

function isCallState(value: string | null): value is CallState {
  return value === "closed" || value === "training" || value === "postponed" || value === "failed";
}

export function usePerformanceReviewData() {
  const [summaries, setSummaries] = useState<RecordSummary[]>([]);
  const [docs, setDocs] = useState<Record<string, DocPair>>({});
  const [lessons, setLessons] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolvedHero, setResolvedHero] = useState<{ id: string; src: string } | null>(null);

  const docTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const metaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      .catch(() => {});
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

  // Resolve the selected record's hero file to a playable convertFileSrc
  // URL. Derived (not reset synchronously) so there's never a stale-id
  // flash: `heroSrc` below falls back to null itself whenever the resolved
  // id doesn't match what's currently selected.
  useEffect(() => {
    const summary = summaries.find((item) => item.id === selectedId);
    if (!summary?.heroFileName || !isTauri()) return;
    let cancelled = false;
    resolveHeroPath(summary.id, summary.heroFileName)
      .then((absolutePath) => {
        if (!cancelled) setResolvedHero({ id: summary.id, src: convertFileSrc(absolutePath) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, summaries]);

  const heroSrc = resolvedHero && resolvedHero.id === selectedId ? resolvedHero.src : null;

  const videos: VideoRecord[] = summaries.map((summary) => ({
    id: summary.id,
    state: isCallState(summary.state) ? summary.state : null,
    date: summary.date,
    title: summary.title,
    transcript: [],
    notes: docs[summary.id]?.notes ?? "",
    aiAnalysis: docs[summary.id]?.aiAnalysis ?? "",
    lessons: lessons[summary.id] ?? "",
    offeredAmount: summary.offeredAmount,
    offeredCurrency: summary.offeredCurrency,
    description: summary.description,
  }));

  const selected = videos.find((video) => video.id === selectedId) ?? null;

  function scheduleDocWrite(id: string, kind: "notes" | "analysis", text: string) {
    const key = `${id}:${kind}`;
    clearTimeout(docTimers.current[key]);
    docTimers.current[key] = setTimeout(() => {
      writeDoc(id, kind, text).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
  }

  function scheduleMetaWrite(id: string, partial: Partial<RecordMetaFields>) {
    clearTimeout(metaTimers.current[id]);
    metaTimers.current[id] = setTimeout(() => {
      writeMeta(id, partial).catch(() => {});
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

  // Creates one record per given path (dialog selection or drag-drop),
  // skipping any that fail rather than aborting the whole batch, then
  // selects the first newly created one.
  const addRecordsFromPaths = useCallback(async (paths: string[]) => {
    const created: RecordSummary[] = [];
    for (const path of paths) {
      try {
        created.push(await createRecordFromFile(path));
      } catch {
        // Skip files that failed to import.
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
    addRecordsFromPaths,
  };
}

// Registers Tauri's native window-level drag-and-drop while the caller is
// mounted. A sandboxed HTML5 `drop` handler only hands back `File` blobs,
// not a real filesystem path — `onDragDropEvent` gives the real path we
// need to copy the file into the record's folder.
export function useRecordDrop(onFilesDropped: (paths: string[]) => void) {
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          onFilesDropped(event.payload.paths);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onFilesDropped]);
}
