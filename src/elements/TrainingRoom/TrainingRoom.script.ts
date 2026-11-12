"use client";

// Data loading/saving for Training Room — bridges the real on-disk session
// storage (src/lib/training) to the TrainingSession shape the UI renders,
// with debounced writes so typing doesn't hit disk on every keystroke. Same
// shape as Performance Review's PerformanceReview.script.ts bridging
// src/lib/records. Clip files were already real storage (see this update's
// wiki.md); this phase makes the session list itself (name, status, notes,
// which clips belong to it) real too, so it survives a reload/restart.
// "Generate transcript" is now real too (src/lib/transcript/generate.ts's
// transcribeVoiceClip/voiceWordsToDialogueEntries, the same ElevenLabs
// pipeline Performance Review uses, minus its track-detection step — a
// practice clip is always one file) — see generateTranscript below.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { useWindowFileDrop } from "@/lib/useWindowFileDrop";
import { setActiveTaggedResource } from "@/lib/mcp/activeTaggedResource";
import {
  clipAbsolutePath,
  createSession,
  deleteSession,
  isLearningDocumentExtension,
  listSessions,
  readTranscriptFile,
  storeClipFile,
  storeLearningFile,
  writeSessionMeta,
  type SessionSummary,
  type StoredClipMeta,
} from "@/lib/training";
import { serializeTranscript, toCanonicalTranscript } from "@/lib/transcript";
import {
  GENERATE_CANCELLED,
  cancelGenerateTranscript,
  onGenerateTranscriptProgress,
  transcribeVoiceClip,
  voiceWordsToDialogueEntries,
  type VoiceTranscriptGenerationState,
} from "@/lib/transcript/generate";
import {
  emptyLearningState,
  parseLearningState,
  TOOL_TYPE_META,
  TOOL_TYPE_ORDER,
  type ClipKind,
  type LearningBlock,
  type LearningFile,
  type LearningFileKind,
  type LearningState,
  type SessionStatus,
  type TrainingClip,
  type TrainingSession,
  type TrainingToolType,
} from "./TrainingRoom.data";
import { parseRoleplayState, type RoleplayState } from "./children/ChatRoleplaySession/ChatRoleplaySession.data";

const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff"]);

function kindForPath(path: string): ClipKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext) ? "audio" : "video";
}

// Learning accepts a third kind (document = pdf/epub, store+download only)
// on top of Voice Training's video/audio split above.
function learningKindForPath(path: string): LearningFileKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (isLearningDocumentExtension(ext)) return "document";
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
    wordTimings: clip.wordTimings,
    diarize: clip.diarize,
  };
}

// `src` is rebuilt here, never trusted from disk — same reasoning as
// clipFromMeta below (see parseLearningFile's comment in TrainingRoom.data.ts).
async function learningFileWithSrc(sessionId: string, file: LearningFile): Promise<LearningFile> {
  const absolutePath = await clipAbsolutePath(sessionId, file.storedFileName);
  return { ...file, src: convertFileSrc(absolutePath) };
}

async function learningStateFromMeta(sessionId: string, raw: unknown): Promise<LearningState | null> {
  const parsed = parseLearningState(raw);
  if (!parsed) return null;
  const files = await Promise.all(parsed.files.map((file) => learningFileWithSrc(sessionId, file)));
  return { ...parsed, files };
}

async function sessionFromSummary(summary: SessionSummary): Promise<TrainingSession> {
  const clips = await Promise.all(summary.clips.map((clip) => clipFromMeta(summary.id, clip)));
  const learning = await learningStateFromMeta(summary.id, summary.learning);
  return {
    id: summary.id,
    toolType: normalizeToolType(summary.toolType),
    name: summary.name,
    status: isSessionStatus(summary.status) ? summary.status : "open",
    lastUpdatedAt: summary.lastUpdatedAt,
    clips,
    notes: summary.notes,
    roleplay: parseRoleplayState(summary.roleplay),
    learning,
  };
}

function clipToMeta(clip: TrainingClip): StoredClipMeta {
  return {
    id: clip.id,
    kind: clip.kind,
    fileName: clip.storedFileName,
    displayName: clip.fileName,
    transcriptRaw: clip.transcriptRaw,
    wordTimings: clip.wordTimings,
    diarize: clip.diarize,
  };
}

// Drops the rebuilt-at-load `src` before persisting — same reasoning as
// clipToMeta above, just for Learning's own file shape.
function learningFileToMeta(file: LearningFile): Omit<LearningFile, "src"> {
  return {
    id: file.id,
    kind: file.kind,
    fileName: file.fileName,
    storedFileName: file.storedFileName,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    transcriptRaw: file.transcriptRaw,
    wordTimings: file.wordTimings,
    diarize: file.diarize,
  };
}

function learningStateToMeta(state: LearningState): unknown {
  return { ...state, files: state.files.map(learningFileToMeta) };
}

export function useTrainingRoomData() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  // Keyed by media id — a Voice Training clip id or a Learning file id
  // (both from the same makeId(), so never collide): several could be
  // generating at once, even across sessions/disciplines, each tracked
  // independently — same reasoning as Performance Review's
  // generationByRecord. Generalized from a Voice-Training-only
  // generationByClip once Learning became a second real consumer of the
  // exact same job-tracking shape.
  const [generationByMedia, setGenerationByMedia] = useState<Record<string, VoiceTranscriptGenerationState>>({});

  // Learning's player lives in LearningHero but its transcript (with the
  // LyricsTranscript word-highlight/seek) renders in LearningDetail, a
  // sibling column — these four bridge that gap without either column
  // needing to know about the other directly. `learningSeekHandlers` is a
  // ref (not state) since it holds functions, never read during render.
  const learningSeekHandlers = useRef<Record<string, (seconds: number) => void>>({});
  const [learningMediaTime, setLearningMediaTime] = useState<Record<string, number>>({});

  const registerLearningMediaSeek = useCallback((fileId: string, seek: ((seconds: number) => void) | null) => {
    if (seek) learningSeekHandlers.current[fileId] = seek;
    else delete learningSeekHandlers.current[fileId];
  }, []);

  const reportLearningMediaTime = useCallback((fileId: string, seconds: number) => {
    setLearningMediaTime((prev) => (prev[fileId] === seconds ? prev : { ...prev, [fileId]: seconds }));
  }, []);

  const seekLearningMedia = useCallback((fileId: string, seconds: number) => {
    learningSeekHandlers.current[fileId]?.(seconds);
  }, []);

  const metaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingMeta = useRef<Record<string, Partial<SessionSummary>>>({});
  // Progress events only carry a job id (see src-tauri/src/transcribe.rs);
  // this maps that back to the session+media it belongs to, same role as
  // Performance Review's generationJobRecord.
  const generationJobMedia = useRef<Record<string, { sessionId: string; mediaId: string }>>({});

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

  // One global subscription for every in-flight Generate Transcript job,
  // same shape as Performance Review's own subscription — the Rust side
  // emits one event type regardless of which pipeline (track-based or
  // Voice Training's single-clip one) started the job.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    onGenerateTranscriptProgress((progress) => {
      const target = generationJobMedia.current[progress.jobId];
      if (!target) return;
      setGenerationByMedia((prev) => {
        const current = prev[target.mediaId];
        return {
          ...prev,
          [target.mediaId]: {
            status: "running",
            jobId: progress.jobId,
            stage: progress.stage,
            percent: progress.percent,
            startedAt: current?.status === "running" ? current.startedAt : Date.now(),
          },
        };
      });
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const selected = sessions.find((session) => session.id === selectedId) ?? null;

  // Tells the AI Assistant (see src/lib/mcp/activeTaggedResource.ts)
  // which Training Room session is currently open here, for every
  // discipline — same "suggested" tag behavior Performance Review's own
  // call site already has. Cleared on unmount (leaving Training Room
  // entirely), not just on every selectedId change.
  useEffect(() => {
    setActiveTaggedResource(selectedId ? { kind: "trainingSession", id: selectedId } : null);
    return () => setActiveTaggedResource(null);
  }, [selectedId]);

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
        roleplay: null,
        learning: toolType === "learning" ? emptyLearningState() : null,
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
  // Chat Roleplay's own state (setup thread, locked scenario, rounds,
  // final report) is a real content change just like notes/clips — every
  // mutation in useChatRoleplaySession already only fires on a commit/
  // submit action (never a raw keystroke), so this always writes
  // immediately rather than needing its own debounce.
  const updateRoleplay = useCallback(
    (sessionId: string, roleplay: RoleplayState) => {
      const lastUpdatedAt = writeNow(sessionId, { roleplay });
      setSessions((prev) =>
        prev.map((session) => (session.id === sessionId ? { ...session, roleplay, lastUpdatedAt } : session))
      );
    },
    [writeNow]
  );

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
          message(String(error), { title: "Couldn't add clip", kind: "error" });
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
        wordTimings: null,
        diarize: null,
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

  // Learning's upload: a video/audio file gets the exact same real-storage
  // treatment addClip gives Voice Training clips (reused via
  // storeLearningFile, not duplicated); a pdf/epub is just copied+stat'd.
  // Uploading always unshifts a fresh {media, text} pair onto the very
  // front of blocks (see LearningBlock's comment in TrainingRoom.data.ts)
  // and selects the new file for LearningDetail — "it is on top, and you
  // can again create notes under it."
  const addLearningFile = useCallback(
    async (sessionId: string, path: string) => {
      let absolutePath = path;
      let storedFileName = fileNameOf(path);
      let displayName = storedFileName;
      let extension = storedFileName.split(".").pop()?.toLowerCase() ?? "";
      let sizeBytes = 0;
      if (isTauri()) {
        try {
          const stored = await storeLearningFile(sessionId, path);
          absolutePath = stored.absolutePath;
          storedFileName = stored.fileName;
          displayName = stored.displayName;
          extension = stored.extension;
          sizeBytes = stored.sizeBytes;
        } catch (error) {
          console.error("Failed to store learning file:", sessionId, error);
          message(String(error), { title: "Couldn't add file", kind: "error" });
          return;
        }
      }
      const file: LearningFile = {
        id: makeId("file"),
        kind: learningKindForPath(path),
        src: convertFileSrc(absolutePath),
        fileName: displayName,
        storedFileName,
        extension,
        sizeBytes,
        transcriptRaw: null,
        wordTimings: null,
        diarize: null,
      };
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId || !session.learning) return session;
          const mediaBlock: LearningBlock = { id: makeId("block"), kind: "media", fileId: file.id };
          const textBlock: LearningBlock = { id: makeId("block"), kind: "text", content: "" };
          const nextLearning: LearningState = {
            ...session.learning,
            files: [file, ...session.learning.files],
            blocks: [mediaBlock, textBlock, ...session.learning.blocks],
            selectedFileId: file.id,
          };
          const lastUpdatedAt = writeNow(sessionId, { learning: learningStateToMeta(nextLearning) });
          return { ...session, learning: nextLearning, lastUpdatedAt };
        })
      );
    },
    [writeNow]
  );

  const addLearningFiles = useCallback(
    (sessionId: string, paths: string[]) => {
      // Same drop-order preservation as addClips above.
      [...paths].reverse().forEach((path) => addLearningFile(sessionId, path));
    },
    [addLearningFile]
  );

  // A text block's free-written content — debounced per-keystroke write,
  // same shape as onNotesChange, just scoped to one block instead of the
  // whole session.
  const updateLearningBlockText = useCallback(
    (sessionId: string, blockId: string, content: string) => {
      const lastUpdatedAt = new Date().toISOString();
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId || !session.learning) return session;
          const nextBlocks = session.learning.blocks.map((block) =>
            block.id === blockId && block.kind === "text" ? { ...block, content } : block
          );
          const nextLearning: LearningState = { ...session.learning, blocks: nextBlocks };
          scheduleMetaWrite(sessionId, { learning: learningStateToMeta(nextLearning), lastUpdatedAt });
          return { ...session, learning: nextLearning, lastUpdatedAt };
        })
      );
    },
    [scheduleMetaWrite]
  );

  // The Hero-wide pin toggle and per-file selection are both view
  // preferences, not training content — persisted (so they survive
  // reopening the session) but, like selectSession, never bump
  // lastUpdatedAt or reorder Navigation.
  const toggleLearningPin = useCallback(
    (sessionId: string) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId || !session.learning) return session;
          const nextLearning: LearningState = { ...session.learning, pinTopMedia: !session.learning.pinTopMedia };
          scheduleMetaWrite(sessionId, { learning: learningStateToMeta(nextLearning) });
          return { ...session, learning: nextLearning };
        })
      );
    },
    [scheduleMetaWrite]
  );

  const selectLearningFile = useCallback(
    (sessionId: string, fileId: string) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId || !session.learning) return session;
          const nextLearning: LearningState = { ...session.learning, selectedFileId: fileId };
          scheduleMetaWrite(sessionId, { learning: learningStateToMeta(nextLearning) });
          return { ...session, learning: nextLearning };
        })
      );
    },
    [scheduleMetaWrite]
  );

  // Looks a media id up across both places it could live — a Voice
  // Training clip or a Learning file — since generateTranscript below is
  // now shared by both disciplines (see generationByMedia's own comment).
  function findMediaRef(session: TrainingSession, mediaId: string): { storedFileName: string; fileName: string } | null {
    const clip = session.clips.find((c) => c.id === mediaId);
    if (clip) return { storedFileName: clip.storedFileName, fileName: clip.fileName };
    const file = session.learning?.files.find((f) => f.id === mediaId);
    if (file) return { storedFileName: file.storedFileName, fileName: file.fileName };
    return null;
  }

  // Real transcription (src/lib/transcript/generate.ts's
  // transcribeVoiceClip), run as a background job the same way Performance
  // Review's startGenerateTranscript is — never blocks the UI, tracked under
  // the media id regardless of which session is currently selected or
  // which discipline owns it (a Voice Training clip or a Learning file;
  // see findMediaRef above and generationByMedia's comment — this is the
  // second real consumer of this exact pipeline, generalized in place
  // rather than copy-pasted). `diarize` is the "with voice recognition"
  // choice (see ClipFeedItem/LearningDetail): off transcribes the media as
  // one speaker, on asks ElevenLabs to separate who's talking by voice
  // rather than by audio track (there's only one track here, unlike
  // Performance Review's multi-mic calls).
  const generateTranscript = useCallback(
    (sessionId: string, mediaId: string, diarize: boolean) => {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      const media = session && findMediaRef(session, mediaId);
      if (!media) return;
      const jobId = makeId("transcribe");
      generationJobMedia.current[jobId] = { sessionId, mediaId };
      setGenerationByMedia((prev) => ({
        ...prev,
        [mediaId]: { status: "running", jobId, stage: "extracting", percent: null, startedAt: Date.now() },
      }));

      (async () => {
        try {
          const absolutePath = await clipAbsolutePath(sessionId, media.storedFileName);
          const words = await transcribeVoiceClip(jobId, absolutePath, media.fileName, diarize);
          const canonical = serializeTranscript({
            meta: [{ key: "generated_at", value: new Date().toISOString() }],
            entries: voiceWordsToDialogueEntries(words, diarize),
          });
          setSessions((prev) =>
            prev.map((candidate) => {
              if (candidate.id !== sessionId) return candidate;
              if (candidate.clips.some((c) => c.id === mediaId)) {
                const nextClips = candidate.clips.map((c) =>
                  c.id === mediaId ? { ...c, transcriptRaw: canonical, wordTimings: words, diarize } : c
                );
                const lastUpdatedAt = writeNow(sessionId, { clips: nextClips.map(clipToMeta) });
                return { ...candidate, clips: nextClips, lastUpdatedAt };
              }
              if (candidate.learning) {
                const nextFiles = candidate.learning.files.map((f) =>
                  f.id === mediaId ? { ...f, transcriptRaw: canonical, wordTimings: words, diarize } : f
                );
                const nextLearning: LearningState = { ...candidate.learning, files: nextFiles };
                const lastUpdatedAt = writeNow(sessionId, { learning: learningStateToMeta(nextLearning) });
                return { ...candidate, learning: nextLearning, lastUpdatedAt };
              }
              return candidate;
            })
          );
          setGenerationByMedia((prev) => {
            const next = { ...prev };
            delete next[mediaId];
            return next;
          });
        } catch (error) {
          const message = typeof error === "string" ? error : String(error);
          setGenerationByMedia((prev) => {
            if (message === GENERATE_CANCELLED) {
              const next = { ...prev };
              delete next[mediaId];
              return next;
            }
            return { ...prev, [mediaId]: { status: "error", message, clipName: media.fileName, diarize } };
          });
        } finally {
          delete generationJobMedia.current[jobId];
        }
      })();
    },
    [sessions, writeNow]
  );

  const stopGenerateTranscript = useCallback(
    (mediaId: string) => {
      const state = generationByMedia[mediaId];
      if (state?.status !== "running") return;
      cancelGenerateTranscript(state.jobId).catch((error) =>
        console.error("Failed to stop transcript generation:", mediaId, error)
      );
    },
    [generationByMedia]
  );

  const retryGenerateTranscript = useCallback(
    (sessionId: string, mediaId: string) => {
      const state = generationByMedia[mediaId];
      if (state?.status !== "error") return;
      generateTranscript(sessionId, mediaId, state.diarize);
    },
    [generationByMedia, generateTranscript]
  );

  const dismissGenerateTranscriptError = useCallback((mediaId: string) => {
    setGenerationByMedia((prev) => {
      if (prev[mediaId]?.status !== "error") return prev;
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
  }, []);

  // Learning's "Upload transcript": a ready-made transcript (a file, or
  // text pasted in — e.g. Fathom's) attached to one video/audio file
  // instead of generating one. Tracked by target so the popup's result
  // always lands on the file it was opened from, whatever's selected later.
  const [transcriptUploadTarget, setTranscriptUploadTarget] = useState<{ sessionId: string; fileId: string } | null>(
    null
  );
  const [transcriptUploadError, setTranscriptUploadError] = useState<string | null>(null);
  const isTranscriptUploadOpen = transcriptUploadTarget !== null;

  const openTranscriptUpload = useCallback((sessionId: string, fileId: string) => {
    setTranscriptUploadError(null);
    setTranscriptUploadTarget({ sessionId, fileId });
  }, []);
  const closeTranscriptUpload = useCallback(() => {
    setTranscriptUploadTarget(null);
    setTranscriptUploadError(null);
  }, []);

  // An uploaded transcript has no real per-word timings (LyricsTranscript
  // falls back to spreading words evenly across each line) and no diarize
  // choice — Regenerate then just uses the plain, non-diarized one.
  const importTranscriptText = useCallback(
    (raw: string) => {
      if (!transcriptUploadTarget) return;
      const { sessionId, fileId } = transcriptUploadTarget;
      const canonical = toCanonicalTranscript(raw);
      if (!canonical) {
        setTranscriptUploadError("That doesn't look like a supported transcript yet.");
        return;
      }
      setSessions((prev) =>
        prev.map((candidate) => {
          if (candidate.id !== sessionId || !candidate.learning) return candidate;
          const nextFiles = candidate.learning.files.map((f) =>
            f.id === fileId ? { ...f, transcriptRaw: canonical, wordTimings: null, diarize: null } : f
          );
          const nextLearning: LearningState = { ...candidate.learning, files: nextFiles };
          const lastUpdatedAt = writeNow(sessionId, { learning: learningStateToMeta(nextLearning) });
          return { ...candidate, learning: nextLearning, lastUpdatedAt };
        })
      );
      setTranscriptUploadTarget(null);
      setTranscriptUploadError(null);
    },
    [transcriptUploadTarget, writeNow]
  );

  const importTranscriptFile = useCallback(
    async (path: string) => {
      if (!transcriptUploadTarget) return;
      let raw: string;
      try {
        raw = await readTranscriptFile(transcriptUploadTarget.sessionId, path);
      } catch (error) {
        console.error("Failed to read transcript file:", path, error);
        setTranscriptUploadError("Couldn't read that file.");
        return;
      }
      importTranscriptText(raw);
    },
    [transcriptUploadTarget, importTranscriptText]
  );

  const onTranscriptFileDrop = useCallback(
    (paths: string[]) => {
      if (paths[0]) void importTranscriptFile(paths[0]);
    },
    [importTranscriptFile]
  );
  const isTranscriptUploadDragActive = useWindowFileDrop(isTranscriptUploadOpen, onTranscriptFileDrop);

  const openUpload = useCallback(() => setIsUploadOpen(true), []);
  const closeUpload = useCallback(() => setIsUploadOpen(false), []);

  const uploadClip = useCallback(
    (path: string) => {
      if (selectedId) {
        if (selected?.toolType === "learning") addLearningFile(selectedId, path);
        else addClip(selectedId, path);
      }
      setIsUploadOpen(false);
    },
    [selectedId, selected, addClip, addLearningFile]
  );

  // Dropping a file anywhere on the page (outside the upload modal)
  // appends it to the currently selected session's feed — same "drop
  // target = whatever's in view" idea as Performance Review's window
  // drop, just appending a clip (or, for Learning, a file) instead of
  // creating a new record.
  const onWindowFileDrop = useCallback(
    (paths: string[]) => {
      if (!selectedId) return;
      if (selected?.toolType === "learning") addLearningFiles(selectedId, paths);
      else addClips(selectedId, paths);
    },
    [selectedId, selected, addLearningFiles, addClips]
  );
  const isDragActive = useWindowFileDrop(
    !isUploadOpen && !isTranscriptUploadOpen && selected !== null,
    onWindowFileDrop
  );

  // While the upload modal itself is open, a drop lands there instead —
  // mutually exclusive with the page-level drop above, same pattern as
  // Performance Review's modal-specific drop hooks.
  const onUploadFileDrop = useCallback(
    (paths: string[]) => {
      if (paths[0]) uploadClip(paths[0]);
    },
    [uploadClip]
  );
  const isUploadDragActive = useWindowFileDrop(isUploadOpen, onUploadFileDrop);

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
    updateRoleplay,
    addClip: uploadClip,
    generateTranscript,
    generationByMedia,
    stopGenerateTranscript,
    retryGenerateTranscript,
    dismissGenerateTranscriptError,
    updateLearningBlockText,
    toggleLearningPin,
    selectLearningFile,
    registerLearningMediaSeek,
    reportLearningMediaTime,
    learningMediaTime,
    seekLearningMedia,
    isUploadOpen,
    openUpload,
    closeUpload,
    isDragActive,
    isUploadDragActive,
    isTranscriptUploadOpen,
    transcriptUploadError,
    isTranscriptUploadDragActive,
    openTranscriptUpload,
    closeTranscriptUpload,
    importTranscriptFile,
    importTranscriptText,
    isDisciplinePickerOpen,
    openDisciplinePicker,
    closeDisciplinePicker,
  };
}
