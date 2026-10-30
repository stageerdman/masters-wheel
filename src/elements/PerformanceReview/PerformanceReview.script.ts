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
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  createRecordFromFile,
  deleteHeroFile,
  deleteRecord,
  heroAbsolutePath,
  heroStreamUrl,
  importTranscriptFile,
  listRecords,
  readDoc,
  readTranscript,
  revealRecordInFinder,
  setHeroFile,
  writeDoc,
  writeMeta,
  writeTranscript,
  type RecordMetaFields,
  type RecordSummary,
} from "@/lib/records";
import { parseTranscript, renameSpeaker, serializeTranscript } from "@/lib/transcript";
import {
  GENERATE_CANCELLED,
  cancelGenerateTranscript,
  onGenerateTranscriptProgress,
  transcribeTracks,
  tracksToDialogueEntries,
  type TrackSelection,
  type TranscriptGenerationState,
} from "@/lib/transcript/generate";
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
  const [isGenerateTranscriptOpen, setIsGenerateTranscriptOpen] = useState(false);
  const [generateTranscriptSourcePath, setGenerateTranscriptSourcePath] = useState<string | null>(null);
  const [generateTranscriptRecordId, setGenerateTranscriptRecordId] = useState<string | null>(null);
  // Keyed by record id, not by job: lets a generation started for one
  // record keep running (and keep showing progress if you flip back to
  // it) regardless of which record is currently selected.
  const [generationByRecord, setGenerationByRecord] = useState<Record<string, TranscriptGenerationState>>({});
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const docTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const metaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingMeta = useRef<Record<string, Partial<RecordMetaFields>>>({});
  // Progress events only carry a job id (see src-tauri/src/transcribe.rs);
  // this maps that back to the record it belongs to so the one global
  // listener below can route each event to the right slot in
  // `generationByRecord`.
  const generationJobRecord = useRef<Record<string, string>>({});

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

  // One global subscription for every in-flight Generate Transcript job
  // (the Rust side emits a single event type carrying its job id — see
  // src/lib/transcript/generate.ts's onGenerateTranscriptProgress) routed
  // to whichever record owns that job via `generationJobRecord`.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    onGenerateTranscriptProgress((progress) => {
      const recordId = generationJobRecord.current[progress.jobId];
      if (!recordId) return;
      setGenerationByRecord((prev) => ({
        ...prev,
        [recordId]: {
          status: "running",
          jobId: progress.jobId,
          stage: progress.stage,
          trackIndex: progress.trackIndex,
          trackCount: progress.trackCount,
          trackName: progress.trackName,
        },
      }));
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

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
    heroFileName: summary.heroFileName,
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

  // Opens Generate Transcript with the selected record's hero file's real
  // absolute path (ffprobe/ffmpeg, run on the Rust side, need a real
  // filesystem path — see src-tauri/src/transcribe.rs — unlike heroSrc's
  // HTTP URL onto the media server). Resolves to null when the record has
  // no hero file yet; the modal surfaces that as its own error state.
  // Captures the target record id alongside the path so the background job
  // started from it is never tied to whatever `selectedId` happens to be
  // later (the modal's own backdrop blocks switching records while it's
  // open, but this keeps the two from silently drifting apart regardless).
  const openGenerateTranscript = useCallback(async () => {
    if (!selectedId) return;
    const id = selectedId;
    const summary = summaries.find((item) => item.id === id);
    const path = summary?.heroFileName ? await heroAbsolutePath(id, summary.heroFileName) : null;
    setGenerateTranscriptRecordId(id);
    setGenerateTranscriptSourcePath(path);
    setIsGenerateTranscriptOpen(true);
  }, [selectedId, summaries]);

  function closeGenerateTranscript() {
    setIsGenerateTranscriptOpen(false);
  }

  // Starts cloud transcription as a background job (never blocks the UI —
  // most calls here are a single track, i.e. a single blocking upload+
  // inference call) and tracks its progress under `recordId` regardless of
  // what's currently selected. On success, applies the result the same way
  // importTranscript applies an uploaded file: canonical on-disk shape,
  // immediate UI update, background write. A stop (cancelGenerateTranscript)
  // clears the record's generation state silently, with no error — only a
  // real failure surfaces one.
  const startGenerateTranscript = useCallback((recordId: string, sourcePath: string, selections: TrackSelection[]) => {
    const jobId = crypto.randomUUID();
    generationJobRecord.current[jobId] = recordId;
    setGenerationByRecord((prev) => ({
      ...prev,
      [recordId]: {
        status: "running",
        jobId,
        stage: "extracting",
        trackIndex: 0,
        trackCount: selections.length,
        trackName: selections[0]?.name ?? "",
      },
    }));

    transcribeTracks(jobId, sourcePath, selections)
      .then((tracks) => {
        const canonical = serializeTranscript({
          meta: [{ key: "generated_at", value: new Date().toISOString() }],
          entries: tracksToDialogueEntries(tracks),
        });
        setTranscripts((prev) => ({ ...prev, [recordId]: canonical }));
        setGenerationByRecord((prev) => {
          const next = { ...prev };
          delete next[recordId];
          return next;
        });
        writeTranscript(recordId, canonical).catch((error) =>
          console.error("Failed to write generated transcript:", recordId, error)
        );
      })
      .catch((error) => {
        const message = typeof error === "string" ? error : String(error);
        setGenerationByRecord((prev) => {
          if (message === GENERATE_CANCELLED) {
            const next = { ...prev };
            delete next[recordId];
            return next;
          }
          return { ...prev, [recordId]: { status: "error", message, sourcePath, selections } };
        });
      })
      .finally(() => {
        delete generationJobRecord.current[jobId];
      });
  }, []);

  const stopGenerateTranscript = useCallback(
    (recordId: string) => {
      const state = generationByRecord[recordId];
      if (state?.status !== "running") return;
      cancelGenerateTranscript(state.jobId).catch((error) =>
        console.error("Failed to stop transcript generation:", recordId, error)
      );
    },
    [generationByRecord]
  );

  const retryGenerateTranscript = useCallback(
    (recordId: string) => {
      const state = generationByRecord[recordId];
      if (state?.status !== "error") return;
      startGenerateTranscript(recordId, state.sourcePath, state.selections);
    },
    [generationByRecord, startGenerateTranscript]
  );

  function dismissGenerateTranscriptError(recordId: string) {
    setGenerationByRecord((prev) => {
      if (prev[recordId]?.status !== "error") return prev;
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  }

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

  // Deletes a record entirely (its whole on-disk folder) and drops it from
  // the list. If it was the selected record, falls back to whichever
  // record is now first rather than leaving the selection dangling.
  const removeRecord = useCallback(
    async (id: string) => {
      const title = summaries.find((item) => item.id === id)?.title ?? id;
      const confirmed = await confirm(`Delete "${title}"? This can't be undone.`, {
        title: "Delete record",
        kind: "warning",
      });
      if (!confirmed) return;
      try {
        await deleteRecord(id);
      } catch (error) {
        console.error("Failed to delete record:", id, error);
        return;
      }
      const remaining = summaries.filter((item) => item.id !== id);
      setSummaries(remaining);
      setSelectedId((current) => (current === id ? remaining[0]?.id ?? null : current));
    },
    [summaries]
  );

  // Deletes just a record's hero video file, leaving the rest of the
  // record (notes, transcript, meta) untouched so a new video can be
  // uploaded in its place.
  const removeHeroMedia = useCallback(
    async (id: string) => {
      const summary = summaries.find((item) => item.id === id);
      if (!summary?.heroFileName) return;
      const confirmed = await confirm(`Remove the video for "${summary.title}"? This can't be undone.`, {
        title: "Remove video",
        kind: "warning",
      });
      if (!confirmed) return;
      try {
        await deleteHeroFile(id, summary.heroFileName);
      } catch (error) {
        console.error("Failed to delete hero file:", id, error);
        return;
      }
      setSummaries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, heroFileName: null } : item))
      );
    },
    [summaries]
  );

  const openRecordFolder = useCallback(async (id: string) => {
    try {
      await revealRecordInFinder(id);
    } catch (error) {
      console.error("Failed to reveal record folder:", id, error);
    }
  }, []);

  function openVideoUpload() {
    setIsVideoUploadOpen(true);
  }

  function closeVideoUpload() {
    setIsVideoUploadOpen(false);
  }

  // Uploads a video as the selected record's hero file — distinct from
  // addRecordsFromPaths, which creates a whole new record. Only usable
  // while the selected record has no hero file yet (Hero only shows the
  // "Upload video" entry point in that state).
  const uploadHeroVideo = useCallback(
    async (sourcePath: string) => {
      if (!selectedId) return;
      const id = selectedId;
      try {
        const heroFileName = await setHeroFile(id, sourcePath);
        setSummaries((prev) => prev.map((item) => (item.id === id ? { ...item, heroFileName } : item)));
        setIsVideoUploadOpen(false);
      } catch (error) {
        console.error("Failed to upload hero video:", id, error);
      }
    },
    [selectedId]
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
    removeRecord,
    removeHeroMedia,
    openRecordFolder,
    isTranscriptUploadOpen,
    transcriptUploadError,
    openTranscriptUpload,
    closeTranscriptUpload,
    importTranscript,
    isGenerateTranscriptOpen,
    generateTranscriptSourcePath,
    generateTranscriptRecordId,
    openGenerateTranscript,
    closeGenerateTranscript,
    transcriptGeneration: selectedId ? generationByRecord[selectedId] ?? null : null,
    startGenerateTranscript,
    stopGenerateTranscript,
    retryGenerateTranscript,
    dismissGenerateTranscriptError,
    renameTranscriptSpeaker,
    isVideoUploadOpen,
    openVideoUpload,
    closeVideoUpload,
    uploadHeroVideo,
  };
}

// Shared window-level drag-and-drop primitive. A sandboxed HTML5 `drop`
// handler only hands back `File` blobs, not a real filesystem path —
// `onDragDropEvent` gives the real path we need to copy the file into a
// record's folder. Also tracks enter/leave so the caller can show a
// drop-zone highlight while something's hovering. `enabled` lets a caller
// temporarily disable this listener entirely — see useRecordDrop and
// useSingleFileDrop below, and CLAUDE.md's note on the page's multiple
// mutually-exclusive drop targets.
function useWindowDrop(enabled: boolean, onDrop: (paths: string[]) => void) {
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
          onDrop(event.payload.paths);
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
  }, [onDrop, enabled]);

  return isDragActive;
}

// Window-level drop that creates a new record from every dropped path.
export function useRecordDrop(onFilesDropped: (paths: string[]) => void, enabled: boolean = true) {
  return useWindowDrop(enabled, onFilesDropped);
}

// Window-level drop that only ever hands back the first dropped path — for
// the transcript and video-upload modals, which each import exactly one
// file into the already-selected record. All three drop hooks on this page
// are mutually exclusive by construction: PerformanceReview.tsx enables
// exactly one at a time depending on which modal (if any) is open, so a
// drop is never claimed by more than one of them.
export function useSingleFileDrop(onFileDropped: (path: string) => void, enabled: boolean) {
  const handleDrop = useCallback(
    (paths: string[]) => {
      if (paths[0]) onFileDropped(paths[0]);
    },
    [onFileDropped]
  );
  return useWindowDrop(enabled, handleDrop);
}
