"use client";

// Data loading/saving for Training Room — bridges the real on-disk session
// storage (src/lib/training) to the TrainingSession shape the UI renders,
// with debounced writes so typing doesn't hit disk on every keystroke. Same
// shape as Performance Review's PerformanceReview.script.ts bridging
// src/lib/records. Clip files were already real storage (see this update's
// wiki.md); this phase makes the session list itself (name, status, notes,
// which clips belong to it) real too, so it survives a reload/restart.
// "Generate transcript" still fabricates a fixed example after a short fake
// delay — no real ElevenLabs call yet.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useWindowFileDrop } from "@/lib/useWindowFileDrop";
import {
  clipAbsolutePath,
  createSession,
  deleteSession,
  listSessions,
  storeClipFile,
  writeSessionMeta,
  type SessionSummary,
  type StoredClipMeta,
} from "@/lib/training";
import {
  TOOL_TYPE_META,
  TOOL_TYPE_ORDER,
  type ClipKind,
  type SessionStatus,
  type TrainingClip,
  type TrainingSession,
  type TrainingToolType,
} from "./TrainingRoom.data";

const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff"]);

function kindForPath(path: string): ClipKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext) ? "audio" : "video";
}

function fileNameOf(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function isToolType(value: string): value is TrainingToolType {
  return (TOOL_TYPE_ORDER as string[]).includes(value);
}

// "voicePracticing" was Voice Training's original stored name, from before
// more disciplines existed — a session.json written under the old name
// still has to load correctly.
const LEGACY_TOOL_TYPE_ALIASES: Record<string, TrainingToolType> = {
  voicePracticing: "voiceTraining",
};

function normalizeToolType(value: string): TrainingToolType {
  if (isToolType(value)) return value;
  return LEGACY_TOOL_TYPE_ALIASES[value] ?? TOOL_TYPE_ORDER[0];
}

function isSessionStatus(value: string): value is SessionStatus {
  return value === "open" || value === "closed";
}

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

// One fixed, hand-written example transcript — same reasoning as
// generateFakeScorecard: a real-shaped result now, swappable for a real
// transcription pass later without changing anything downstream. A
// single "You" speaker, since Voice Training is solo.
const FAKE_TRANSCRIPT = `---
source: fake
---

**You** [0:00]
Okay, let's run through the opening again from the top.

**You** [0:04]
Hey, thanks so much for jumping on with me today — I know you're busy, so I'll keep this focused.

**You** [0:11]
I want to start by understanding where things stand right now before we talk about anything else.

**You** [0:18]
Can you walk me through what a normal week looks like for your team at the moment?

**You** [0:24]
Got it — that's really helpful context, and it lines up with what I was expecting to hear.
`;

const GENERATE_TRANSCRIPT_DELAY_MS = 1200;
const WRITE_DEBOUNCE_MS = 400;

function nameFor(toolType: TrainingToolType, existing: TrainingSession[]): string {
  const count = existing.filter((session) => session.toolType === toolType).length;
  return `${TOOL_TYPE_META[toolType].label} #${count + 1}`;
}

async function clipFromMeta(sessionId: string, clip: StoredClipMeta): Promise<TrainingClip> {
  const absolutePath = await clipAbsolutePath(sessionId, clip.fileName);
  return {
    id: clip.id,
    kind: clip.kind === "audio" ? "audio" : "video",
    src: convertFileSrc(absolutePath),
    fileName: clip.displayName,
    storedFileName: clip.fileName,
    transcriptRaw: clip.transcriptRaw,
    isGeneratingTranscript: false,
  };
}

async function sessionFromSummary(summary: SessionSummary): Promise<TrainingSession> {
  const clips = await Promise.all(summary.clips.map((clip) => clipFromMeta(summary.id, clip)));
  return {
    id: summary.id,
    toolType: normalizeToolType(summary.toolType),
    name: summary.name,
    status: isSessionStatus(summary.status) ? summary.status : "open",
    lastUpdatedAt: summary.lastUpdatedAt,
    clips,
    notes: summary.notes,
  };
}

function clipToMeta(clip: TrainingClip): StoredClipMeta {
  return {
    id: clip.id,
    kind: clip.kind,
    fileName: clip.storedFileName,
    displayName: clip.fileName,
    transcriptRaw: clip.transcriptRaw,
  };
}

export function useTrainingRoomData() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const metaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingMeta = useRef<Record<string, Partial<SessionSummary>>>({});

  // Merges into any already-pending partial for this session rather than
  // replacing it — same shape as Performance Review's scheduleMetaWrite.
  const scheduleMetaWrite = useCallback((id: string, partial: Partial<SessionSummary>) => {
    if (!isTauri()) return;
    pendingMeta.current[id] = { ...pendingMeta.current[id], ...partial };
    clearTimeout(metaTimers.current[id]);
    metaTimers.current[id] = setTimeout(() => {
      const toWrite = pendingMeta.current[id];
      delete pendingMeta.current[id];
      writeSessionMeta(id, toWrite).catch((error) => console.error("Failed to write session meta:", id, error));
    }, WRITE_DEBOUNCE_MS);
  }, []);

  // Bumps lastUpdatedAt and persists a field immediately (no debounce) —
  // for discrete events (adding a clip, generating a transcript) rather
  // than per-keystroke edits. Always returns the new timestamp so the
  // in-memory state stays consistent even outside the Tauri shell, where
  // there's no fs bridge to persist to.
  const writeNow = useCallback((id: string, partial: Partial<SessionSummary>) => {
    const lastUpdatedAt = new Date().toISOString();
    if (isTauri()) {
      writeSessionMeta(id, { ...partial, lastUpdatedAt }).catch((error) =>
        console.error("Failed to write session meta:", id, error)
      );
    }
    return lastUpdatedAt;
  }, []);

  // Initial load. Outside the Tauri shell there's no fs bridge at all —
  // just stay empty rather than throwing.
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    listSessions()
      .then((summaries) => Promise.all(summaries.map(sessionFromSummary)))
      .then((loaded) => {
        if (cancelled) return;
        setSessions(loaded);
        setSelectedIdState((current) => current ?? loaded[0]?.id ?? null);
      })
      .catch((error) => console.error("Failed to load training sessions:", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = sessions.find((session) => session.id === selectedId) ?? null;

  const openSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "open")
        .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)),
    [sessions]
  );
  const closedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "closed")
        .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)),
    [sessions]
  );

  // Opening/selecting a session is navigation, not an edit — it must not
  // bump lastUpdatedAt (that's reserved for real content changes, see
  // onNotesChange/addClip below), or Open Sessions would reorder just
  // from clicking around.
  const selectSession = useCallback((id: string) => {
    setSelectedIdState(id);
  }, []);

  const addSession = useCallback(
    (toolType: TrainingToolType) => {
      const id = makeId("session");
      const name = nameFor(toolType, sessions);
      const fresh: TrainingSession = {
        id,
        toolType,
        name,
        status: "open",
        lastUpdatedAt: new Date().toISOString(),
        clips: [],
        notes: "",
      };
      setSessions((prev) => [fresh, ...prev]);
      setSelectedIdState(id);
      if (isTauri()) {
        createSession(id, toolType, name).catch((error) => console.error("Failed to create session:", id, error));
      }
    },
    [sessions]
  );

  // DisciplinePicker's open/closed state — opened from Navigation's "Add a
  // discipline" row, closed on a real selection, Esc, or a click on blank
  // space inside the picker itself (see DisciplinePicker.script.ts).
  const [isDisciplinePickerOpen, setIsDisciplinePickerOpen] = useState(false);
  const openDisciplinePicker = useCallback(() => setIsDisciplinePickerOpen(true), []);
  const closeDisciplinePicker = useCallback(() => setIsDisciplinePickerOpen(false), []);

  const removeSession = useCallback(
    async (id: string) => {
      const target = sessions.find((session) => session.id === id);
      const confirmed = await confirm(`Delete "${target?.name ?? id}"? This can't be undone.`, {
        title: "Delete session",
        kind: "warning",
      });
      if (!confirmed) return;
      if (isTauri()) await deleteSession(id);
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id);
        if (selectedId === id) setSelectedIdState(next[0]?.id ?? null);
        return next;
      });
    },
    [sessions, selectedId]
  );

  const setSessionStatus = useCallback(
    (id: string, status: SessionStatus) => {
      setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, status } : session)));
      scheduleMetaWrite(id, { status });
    },
    [scheduleMetaWrite]
  );

  const renameSession = useCallback(
    (id: string, name: string) => {
      setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, name } : session)));
      scheduleMetaWrite(id, { name });
    },
    [scheduleMetaWrite]
  );

  // Bumping lastUpdatedAt on every keystroke would reorder the Navigation
  // list while the user is still mid-sentence — debounce it to settle a
  // moment after typing stops, same shape as Performance Review's
  // debounced disk writes.
  const onNotesChange = useCallback(
    (id: string, notes: string) => {
      const lastUpdatedAt = new Date().toISOString();
      setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, notes, lastUpdatedAt } : session)));
      scheduleMetaWrite(id, { notes, lastUpdatedAt });
    },
    [scheduleMetaWrite]
  );

  // Uploading a clip is a real content change too, so it bumps
  // lastUpdatedAt — unlike mere selection. The picked path is almost
  // never inside the asset protocol's allowed scope ($DOCUMENT/Master's
  // Wheel/**), so it's copied into real Space storage first (see
  // src/lib/training) before being played back via convertFileSrc —
  // playing the picked path directly silently fails outside that scope.
  const addClip = useCallback(
    async (sessionId: string, path: string) => {
      let absolutePath = path;
      let storedFileName = fileNameOf(path);
      let displayName = storedFileName;
      if (isTauri()) {
        try {
          const stored = await storeClipFile(sessionId, path);
          absolutePath = stored.absolutePath;
          storedFileName = stored.fileName;
          displayName = stored.displayName;
        } catch (error) {
          console.error("Failed to store clip file:", sessionId, error);
          return;
        }
      }
      const clip: TrainingClip = {
        id: makeId("clip"),
        kind: kindForPath(path),
        src: convertFileSrc(absolutePath),
        fileName: displayName,
        storedFileName,
        transcriptRaw: null,
        isGeneratingTranscript: false,
      };
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          const nextClips = [clip, ...session.clips];
          const lastUpdatedAt = writeNow(sessionId, { clips: nextClips.map(clipToMeta) });
          return { ...session, clips: nextClips, lastUpdatedAt };
        })
      );
    },
    [writeNow]
  );

  const addClips = useCallback(
    (sessionId: string, paths: string[]) => {
      // Preserve drop order at the top of the feed: the first dropped path
      // ends up just above the clips that existed before the drop.
      [...paths].reverse().forEach((path) => addClip(sessionId, path));
    },
    [addClip]
  );

  const generateTranscript = useCallback(
    (sessionId: string, clipId: string) => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                clips: session.clips.map((clip) =>
                  clip.id === clipId ? { ...clip, isGeneratingTranscript: true } : clip
                ),
              }
            : session
        )
      );
      setTimeout(() => {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;
            const nextClips = session.clips.map((clip) =>
              clip.id === clipId ? { ...clip, isGeneratingTranscript: false, transcriptRaw: FAKE_TRANSCRIPT } : clip
            );
            const lastUpdatedAt = writeNow(sessionId, { clips: nextClips.map(clipToMeta) });
            return { ...session, clips: nextClips, lastUpdatedAt };
          })
        );
      }, GENERATE_TRANSCRIPT_DELAY_MS);
    },
    [writeNow]
  );

  const openUpload = useCallback(() => setIsUploadOpen(true), []);
  const closeUpload = useCallback(() => setIsUploadOpen(false), []);

  const uploadClip = useCallback(
    (path: string) => {
      if (selectedId) addClip(selectedId, path);
      setIsUploadOpen(false);
    },
    [selectedId, addClip]
  );

  // Dropping a file anywhere on the page (outside the upload modal)
  // appends it to the currently selected session's feed — same "drop
  // target = whatever's in view" idea as Performance Review's window
  // drop, just appending a clip instead of creating a new record.
  const isDragActive = useWindowFileDrop(!isUploadOpen && selected !== null, (paths) => {
    if (selectedId) addClips(selectedId, paths);
  });

  // While the upload modal itself is open, a drop lands there instead —
  // mutually exclusive with the page-level drop above, same pattern as
  // Performance Review's modal-specific drop hooks.
  const isUploadDragActive = useWindowFileDrop(isUploadOpen, (paths) => {
    if (paths[0]) uploadClip(paths[0]);
  });

  return {
    openSessions,
    closedSessions,
    selected,
    selectedId,
    selectSession,
    addSession,
    removeSession,
    closeSession: (id: string) => setSessionStatus(id, "closed"),
    reopenSession: (id: string) => setSessionStatus(id, "open"),
    renameSession,
    onNotesChange,
    addClip: uploadClip,
    generateTranscript,
    isUploadOpen,
    openUpload,
    closeUpload,
    isDragActive,
    isUploadDragActive,
    isDisciplinePickerOpen,
    openDisciplinePicker,
    closeDisciplinePicker,
  };
}
