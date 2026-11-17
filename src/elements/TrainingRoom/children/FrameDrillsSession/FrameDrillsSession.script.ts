"use client";

// Frame Drills' client logic: the Space-wide templates list, every drill
// edit (all funneled through TrainingRoom.script.ts's updateFrameDrills),
// and the recorder — one MediaRecorder at a time, so only one drill can
// ever be recording/timing at once.

import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import {
  DEFAULT_TIMER_SECONDS,
  takeDownloadName,
  upsertTemplate,
  type DrillTake,
  type FrameDrill,
  type FrameDrillsState,
  type FrameTemplate,
} from "@/lib/frameDrills";
import { downloadTake as copyTakeToDownloads, loadTemplates, removeTake, saveTemplates, storeTake } from "@/lib/frameDrills/storage";

// How long a take's download button shows its "Saved" check.
const DOWNLOADED_MS = 2000;
// How long the "Time's up" pop stays on the card once the timer hits zero.
const TIME_UP_POP_MS = 4000;
const TICK_MS = 200;

let nextId = 1;
function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

export type TemplateSaveTarget = { kind: "new"; name: string } | { kind: "replace"; id: string };

export type UpdateFrameDrills = (update: (prev: FrameDrillsState) => FrameDrillsState) => void;

type ActiveRecording = { drillId: string; startedAt: number; timerSeconds: number | null };

type LiveRecorder = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  drillId: string;
  startedAt: number;
};

function mapDrill(state: FrameDrillsState, drillId: string, change: (drill: FrameDrill) => FrameDrill): FrameDrillsState {
  return { drills: state.drills.map((drill) => (drill.id === drillId ? change(drill) : drill)) };
}

export function useFrameDrillsSession(sessionId: string, drills: FrameDrill[], update: UpdateFrameDrills) {
  // ---- Templates (Space-wide, shared by every Frame Drills session) ----
  const [templates, setTemplates] = useState<FrameTemplate[]>([]);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    loadTemplates()
      .then((loaded) => {
        if (!cancelled) setTemplates(loaded);
      })
      .catch((error) => console.error("Failed to load frame templates:", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTemplates = useCallback((next: FrameTemplate[]) => {
    setTemplates(next);
    if (isTauri()) {
      saveTemplates(next).catch((error) => {
        console.error("Failed to save frame templates:", error);
        message(String(error), { title: "Couldn't save template", kind: "error" });
      });
    }
  }, []);

  // A new named template, or rewrite an existing one's text.
  const saveAsTemplate = useCallback(
    (text: string, target: TemplateSaveTarget) => {
      persistTemplates(upsertTemplate(templates, text, target, new Date().toISOString(), makeId("template")));
    },
    [templates, persistTemplates]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const confirmed = await confirm("Delete this saved frame? Drills already using it keep their text.", {
        title: "Delete frame",
        kind: "warning",
      });
      if (!confirmed) return;
      persistTemplates(templates.filter((template) => template.id !== templateId));
    },
    [templates, persistTemplates]
  );

  // ---- Drills ----
  // The drill that should grab focus once rendered — a freshly added empty
  // one, so the user can start typing right away.
  const [focusDrillId, setFocusDrillId] = useState<string | null>(null);

  const addDrill = useCallback(
    (text: string) => {
      const id = makeId("drill");
      update((prev) => ({
        // A new drill inherits the most recent drill's timer — drilling a
        // set of frames usually means the same time box for each.
        drills: [
          { id, text, timerSeconds: prev.drills[0]?.timerSeconds ?? DEFAULT_TIMER_SECONDS, takes: [] },
          ...prev.drills,
        ],
      }));
      if (!text) setFocusDrillId(id);
    },
    [update]
  );

  const setDrillText = useCallback(
    (drillId: string, text: string) => update((prev) => mapDrill(prev, drillId, (drill) => ({ ...drill, text }))),
    [update]
  );

  const setDrillTimer = useCallback(
    (drillId: string, timerSeconds: number | null) =>
      update((prev) => mapDrill(prev, drillId, (drill) => ({ ...drill, timerSeconds }))),
    [update]
  );

  const removeDrill = useCallback(
    async (drill: FrameDrill) => {
      if (drill.takes.length > 0) {
        const confirmed = await confirm(
          `Remove this drill and its ${drill.takes.length === 1 ? "recording" : `${drill.takes.length} recordings`}? This can't be undone.`,
          { title: "Remove drill", kind: "warning" }
        );
        if (!confirmed) return;
      }
      update((prev) => ({ drills: prev.drills.filter((candidate) => candidate.id !== drill.id) }));
      if (isTauri()) {
        for (const take of drill.takes) {
          removeTake(sessionId, take.storedFileName).catch((error) => console.error("Failed to remove take:", error));
        }
      }
    },
    [sessionId, update]
  );

  const saveTake = useCallback(
    async (drillId: string, blob: Blob, durationMs: number) => {
      let src: string;
      let storedFileName = "";
      try {
        if (isTauri()) {
          const stored = await storeTake(sessionId, blob);
          storedFileName = stored.storedFileName;
          src = convertFileSrc(stored.absolutePath);
        } else {
          // Dev browser: no fs bridge, so the take only lives for this page.
          src = URL.createObjectURL(blob);
        }
      } catch (error) {
        console.error("Failed to store take:", sessionId, error);
        message(String(error), { title: "Couldn't save recording", kind: "error" });
        return;
      }
      const take: DrillTake = { id: makeId("take"), storedFileName, src, recordedAt: new Date().toISOString(), durationMs };
      update((prev) => mapDrill(prev, drillId, (drill) => ({ ...drill, takes: [take, ...drill.takes] })));
    },
    [sessionId, update]
  );

  // ---- Takes: download to ~/Downloads, delete (no confirm — one click) ----
  const [downloadedTakeId, setDownloadedTakeId] = useState<string | null>(null);
  useEffect(() => {
    if (!downloadedTakeId) return;
    const timeout = setTimeout(() => setDownloadedTakeId(null), DOWNLOADED_MS);
    return () => clearTimeout(timeout);
  }, [downloadedTakeId]);

  const downloadTake = useCallback(
    async (drill: FrameDrill, take: DrillTake, takeNumber: number) => {
      const fileName = takeDownloadName(drill.text, takeNumber, take.storedFileName || "take.m4a");
      try {
        if (isTauri()) {
          await copyTakeToDownloads(sessionId, take.storedFileName, fileName);
        } else {
          // Dev browser: the take is a blob URL — let the browser download it.
          const link = document.createElement("a");
          link.href = take.src;
          link.download = fileName;
          link.click();
        }
        setDownloadedTakeId(take.id);
      } catch (error) {
        console.error("Failed to download take:", sessionId, error);
        message(String(error), { title: "Couldn't download recording", kind: "error" });
      }
    },
    [sessionId]
  );

  const deleteTake = useCallback(
    (drillId: string, take: DrillTake) => {
      update((prev) =>
        mapDrill(prev, drillId, (drill) => ({ ...drill, takes: drill.takes.filter((candidate) => candidate.id !== take.id) }))
      );
      if (isTauri() && take.storedFileName) {
        removeTake(sessionId, take.storedFileName).catch((error) => console.error("Failed to remove take:", error));
      }
    },
    [sessionId, update]
  );

  // ---- Recorder: exactly one drill at a time ----
  const [active, setActive] = useState<ActiveRecording | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [timeUpDrillId, setTimeUpDrillId] = useState<string | null>(null);
  const [micError, setMicError] = useState<{ drillId: string; text: string } | null>(null);
  // Guards the async gap between pressing play and the mic actually
  // opening, so a double-click (or a second drill's play) can't start two.
  const busyRef = useRef(false);
  const liveRef = useRef<LiveRecorder | null>(null);
  const timeUpFiredRef = useRef(false);
  const saveTakeRef = useRef(saveTake);
  useEffect(() => {
    saveTakeRef.current = saveTake;
  }, [saveTake]);

  const stop = useCallback(() => {
    const live = liveRef.current;
    if (!live) return;
    liveRef.current = null;
    busyRef.current = false;
    live.recorder.stop();
    setActive(null);
    setTimeUpDrillId(null);
  }, []);

  const start = useCallback(async (drill: FrameDrill, beforeStart: () => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMicError(null);
    beforeStart();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      busyRef.current = false;
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setMicError({
        drillId: drill.id,
        text: denied
          ? "Microphone access is off — allow Master's Wheel in System Settings › Privacy & Security › Microphone."
          : `Couldn't open the microphone: ${String(error)}`,
      });
      return;
    }
    const recorder = new MediaRecorder(stream);
    const startedAt = Date.now();
    const live: LiveRecorder = { recorder, stream, chunks: [], drillId: drill.id, startedAt };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) live.chunks.push(event.data);
    };
    recorder.onstop = () => {
      live.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(live.chunks, { type: recorder.mimeType || live.chunks[0]?.type || "audio/mp4" });
      if (blob.size > 0) void saveTakeRef.current(live.drillId, blob, Date.now() - live.startedAt);
    };
    recorder.start(1000);
    liveRef.current = live;
    timeUpFiredRef.current = false;
    setNow(startedAt);
    setActive({ drillId: drill.id, startedAt, timerSeconds: drill.timerSeconds });
  }, []);

  // The clock tick, plus the one-shot "Time's up" pop when it crosses zero.
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (
        active.timerSeconds !== null &&
        !timeUpFiredRef.current &&
        current - active.startedAt >= active.timerSeconds * 1000
      ) {
        timeUpFiredRef.current = true;
        setTimeUpDrillId(active.drillId);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!timeUpDrillId) return;
    const timeout = setTimeout(() => setTimeUpDrillId(null), TIME_UP_POP_MS);
    return () => clearTimeout(timeout);
  }, [timeUpDrillId]);

  // Leaving the session (or Training Room) mid-take still saves it.
  useEffect(() => stop, [stop]);

  const elapsedMs = active ? Math.max(0, now - active.startedAt) : 0;

  return {
    drills,
    templates,
    saveAsTemplate,
    deleteTemplate,
    addDrill,
    setDrillText,
    setDrillTimer,
    removeDrill,
    downloadTake,
    downloadedTakeId,
    deleteTake,
    focusDrillId,
    clearFocusDrill: () => setFocusDrillId(null),
    activeDrillId: active?.drillId ?? null,
    elapsedMs,
    timeUpDrillId,
    micError,
    startRecording: start,
    stopRecording: stop,
  };
}
