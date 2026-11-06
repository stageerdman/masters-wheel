"use client";

// In-memory state for Training Room — Phase 1 is UI-shell-only (see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/`): nothing here survives a
// reload, same starting point Performance Review had before
// `src/lib/records` existed. Clip playback already uses a real picked
// file via Tauri's `convertFileSrc`, and "Generate transcript" fabricates
// a fixed example after a short fake delay (same shape as
// `generateFakeScorecard` — no real ElevenLabs call yet).

import { useCallback, useMemo, useRef, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useWindowFileDrop } from "@/lib/useWindowFileDrop";
import { removeSessionStorage, storeClipFile } from "@/lib/training";
import {
  TOOL_TYPE_ORDER,
  type ClipKind,
  type TrainingClip,
  type TrainingSession,
} from "./TrainingRoom.data";

const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff"]);

function kindForPath(path: string): ClipKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext) ? "audio" : "video";
}

function fileNameOf(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

// One fixed, hand-written example transcript — same reasoning as
// generateFakeScorecard: a real-shaped result now, swappable for a real
// transcription pass later without changing anything downstream. A
// single "You" speaker, since Voice Practicing is solo.
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

function nameFor(toolType: TrainingSession["toolType"], existing: TrainingSession[]): string {
  const count = existing.filter((session) => session.toolType === toolType).length;
  const label = toolType === "voicePracticing" ? "Voice Practicing" : toolType;
  return `${label} #${count + 1}`;
}

const INITIAL_SESSIONS: TrainingSession[] = [
  {
    id: "seed-1",
    toolType: "voicePracticing",
    name: "Voice Practicing #1",
    status: "open",
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    clips: [],
    notes: "",
  },
  {
    id: "seed-2",
    toolType: "voicePracticing",
    name: "Cold open drills",
    status: "open",
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    clips: [],
    notes: "",
  },
  {
    id: "seed-3",
    toolType: "voicePracticing",
    name: "Objection handling warm-up",
    status: "closed",
    lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    clips: [],
    notes: "",
  },
];

export function useTrainingRoomData() {
  const [sessions, setSessions] = useState<TrainingSession[]>(INITIAL_SESSIONS);
  const [selectedId, setSelectedIdState] = useState<string | null>(INITIAL_SESSIONS[0]?.id ?? null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

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

  const addSession = useCallback(() => {
    const toolType = TOOL_TYPE_ORDER[0];
    setSessions((prev) => {
      const fresh: TrainingSession = {
        id: makeId("session"),
        toolType,
        name: nameFor(toolType, prev),
        status: "open",
        lastUpdatedAt: new Date().toISOString(),
        clips: [],
        notes: "",
      };
      setSelectedIdState(fresh.id);
      return [fresh, ...prev];
    });
  }, []);

  const removeSession = useCallback(
    async (id: string) => {
      const target = sessions.find((session) => session.id === id);
      const confirmed = await confirm(`Delete "${target?.name ?? id}"? This can't be undone.`, {
        title: "Delete session",
        kind: "warning",
      });
      if (!confirmed) return;
      if (isTauri()) await removeSessionStorage(id);
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id);
        if (selectedId === id) setSelectedIdState(next[0]?.id ?? null);
        return next;
      });
    },
    [sessions, selectedId]
  );

  const setSessionStatus = useCallback((id: string, status: TrainingSession["status"]) => {
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, status } : session)));
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, name } : session)));
  }, []);

  // Bumping lastUpdatedAt on every keystroke would reorder the Navigation
  // list while the user is still mid-sentence — debounce it to settle a
  // moment after typing stops, same shape as Performance Review's
  // debounced disk writes (this has no disk write to debounce, just the
  // timestamp).
  const NOTES_UPDATE_DEBOUNCE_MS = 800;
  const notesUpdateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onNotesChange = useCallback((id: string, notes: string) => {
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, notes } : session)));
    clearTimeout(notesUpdateTimers.current[id]);
    notesUpdateTimers.current[id] = setTimeout(() => {
      setSessions((prev) =>
        prev.map((session) => (session.id === id ? { ...session, lastUpdatedAt: new Date().toISOString() } : session))
      );
    }, NOTES_UPDATE_DEBOUNCE_MS);
  }, []);

  // Uploading a clip is a real content change too, so it bumps
  // lastUpdatedAt — unlike mere selection. The picked path is almost
  // never inside the asset protocol's allowed scope ($DOCUMENT/Master's
  // Wheel/**), so it's copied into real Space storage first (see
  // src/lib/training) before being played back via convertFileSrc —
  // playing the picked path directly silently fails outside that scope.
  const addClip = useCallback(async (sessionId: string, path: string) => {
    let absolutePath = path;
    let displayName = fileNameOf(path);
    if (isTauri()) {
      try {
        const stored = await storeClipFile(sessionId, path);
        absolutePath = stored.absolutePath;
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
      transcriptRaw: null,
      isGeneratingTranscript: false,
    };
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, clips: [clip, ...session.clips], lastUpdatedAt: new Date().toISOString() }
          : session
      )
    );
  }, []);

  const addClips = useCallback(
    (sessionId: string, paths: string[]) => {
      // Preserve drop order at the top of the feed: the first dropped path
      // ends up just above the clips that existed before the drop.
      [...paths].reverse().forEach((path) => addClip(sessionId, path));
    },
    [addClip]
  );

  const generateTranscript = useCallback((sessionId: string, clipId: string) => {
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
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                clips: session.clips.map((clip) =>
                  clip.id === clipId
                    ? { ...clip, isGeneratingTranscript: false, transcriptRaw: FAKE_TRANSCRIPT }
                    : clip
                ),
              }
            : session
        )
      );
    }, GENERATE_TRANSCRIPT_DELAY_MS);
  }, []);

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
  };
}
