// Frame Drills' pure model — no React, no Tauri, so `npm test` can import
// it directly. Persisted shape: a session's `frameDrills` field in
// session.json (see src/lib/training) and the Space-wide
// frame-templates.json (see ./storage.ts). Same "missing or corrupt is
// just absent, not a crash" parsing tolerance as the rest of Training Room.

// One recorded attempt at a drill — an audio file in the session folder.
export type DrillTake = {
  id: string;
  // On-disk name inside training/<sessionId>/ — `src` is rebuilt from it
  // on load, never trusted from disk.
  storedFileName: string;
  src: string;
  recordedAt: string;
  durationMs: number;
};

export type FrameDrill = {
  id: string;
  text: string;
  // null = no timer (the clock just counts up).
  timerSeconds: number | null;
  // Newest first.
  takes: DrillTake[];
};

export type FrameDrillsState = {
  // Newest first — the Hero feed's order.
  drills: FrameDrill[];
};

export type FrameTemplate = {
  id: string;
  // User-given, set when the template is first saved; what the Detail's
  // frames list shows.
  name: string;
  text: string;
  updatedAt: string;
};

// The timer select's choices, in seconds. null = "No timer".
// Drills are long-form (dictated: default 30 min, in 10-minute steps).
export const TIMER_OPTIONS: (number | null)[] = [null, 600, 1200, 1800, 2400, 3000, 3600];

export const DEFAULT_TIMER_SECONDS = 1800;

export function emptyFrameDrillsState(): FrameDrillsState {
  return { drills: [] };
}

// "m:ss", with a leading minus once past zero — the drill clock goes into
// minus when the user keeps talking past the timer.
export function formatDrillClock(ms: number): string {
  const negative = ms < 0;
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${negative ? "-" : ""}${minutes}:${String(seconds).padStart(2, "0")}`;
}

// What the clock shows `elapsedMs` into a take: time remaining (going
// negative past zero) with a timer, plain elapsed time without one.
export function drillClockMs(elapsedMs: number, timerSeconds: number | null): number {
  return timerSeconds === null ? elapsedMs : timerSeconds * 1000 - elapsedMs;
}

export function timerOptionLabel(seconds: number | null): string {
  return seconds === null ? "No timer" : formatDrillClock(seconds * 1000);
}

// The timer select's choices — plus a drill's current value if it isn't
// one of them (a drill saved before the options changed), so the select
// never silently shows the wrong value.
export function timerOptionsFor(current: number | null): (number | null)[] {
  if (TIMER_OPTIONS.includes(current)) return TIMER_OPTIONS;
  return [...TIMER_OPTIONS, current].sort((a, b) => (a ?? -1) - (b ?? -1));
}

// What to call a template with no name (one saved before names existed).
export function fallbackTemplateName(text: string): string {
  const firstLine = text.trim().split("\n")[0] ?? "";
  return firstLine.length > 40 ? `${firstLine.slice(0, 40).trimEnd()}…` : firstLine || "Untitled frame";
}

// Saving a drill as a template. `target` "new" creates one on top with
// the given name; otherwise that template's text is rewritten in place
// (keeping its name) and moved to the top, as the most recently touched.
export function upsertTemplate(
  templates: FrameTemplate[],
  text: string,
  target: { kind: "new"; name: string } | { kind: "replace"; id: string },
  now: string,
  newId: string
): FrameTemplate[] {
  if (target.kind === "replace") {
    const existing = templates.find((template) => template.id === target.id);
    if (existing) {
      const updated = { ...existing, text, updatedAt: now };
      return [updated, ...templates.filter((template) => template.id !== target.id)];
    }
    return [{ id: newId, name: fallbackTemplateName(text), text, updatedAt: now }, ...templates];
  }
  const name = target.name.trim() || fallbackTemplateName(text);
  return [{ id: newId, name, text, updatedAt: now }, ...templates];
}

function parseTake(raw: unknown): DrillTake | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<DrillTake>;
  if (typeof candidate.id !== "string" || typeof candidate.storedFileName !== "string") return null;
  return {
    id: candidate.id,
    storedFileName: candidate.storedFileName,
    src: "",
    recordedAt: typeof candidate.recordedAt === "string" ? candidate.recordedAt : "",
    durationMs: typeof candidate.durationMs === "number" ? candidate.durationMs : 0,
  };
}

function parseDrill(raw: unknown): FrameDrill | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<FrameDrill>;
  if (typeof candidate.id !== "string") return null;
  const takes = Array.isArray(candidate.takes)
    ? candidate.takes.map(parseTake).filter((take): take is DrillTake => take !== null)
    : [];
  return {
    id: candidate.id,
    text: typeof candidate.text === "string" ? candidate.text : "",
    timerSeconds: typeof candidate.timerSeconds === "number" ? candidate.timerSeconds : null,
    takes,
  };
}

export function parseFrameDrillsState(raw: unknown): FrameDrillsState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<FrameDrillsState>;
  const drills = Array.isArray(candidate.drills)
    ? candidate.drills.map(parseDrill).filter((drill): drill is FrameDrill => drill !== null)
    : [];
  return { drills };
}

// Drops the rebuilt-at-load `src` before persisting.
export function frameDrillsStateToMeta(state: FrameDrillsState): unknown {
  return {
    drills: state.drills.map((drill) => ({
      ...drill,
      takes: drill.takes.map((take) => ({
        id: take.id,
        storedFileName: take.storedFileName,
        recordedAt: take.recordedAt,
        durationMs: take.durationMs,
      })),
    })),
  };
}

export function parseTemplates(text: string): FrameTemplate[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  const list = raw && typeof raw === "object" ? (raw as { templates?: unknown }).templates : null;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<FrameTemplate>;
    if (typeof candidate.id !== "string" || typeof candidate.text !== "string") return [];
    return [
      {
        id: candidate.id,
        name:
          typeof candidate.name === "string" && candidate.name.trim()
            ? candidate.name
            : fallbackTemplateName(candidate.text),
        text: candidate.text,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
      },
    ];
  });
}

// File extension for a MediaRecorder blob's mime type. WKWebView records
// audio/mp4 (AAC); a dev browser may record webm.
export function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  return "m4a";
}

// The file name a downloaded take gets in ~/Downloads: the frame's first
// words + take number, keeping the stored file's extension. Characters
// Finder/the filesystem dislike are dropped.
export function takeDownloadName(drillText: string, takeNumber: number, storedFileName: string): string {
  const extension = storedFileName.includes(".") ? storedFileName.slice(storedFileName.lastIndexOf(".") + 1) : "m4a";
  const firstLine = (drillText.trim().split("\n")[0] ?? "").replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  const label = firstLine.length > 40 ? firstLine.slice(0, 40).trimEnd() : firstLine || "Frame drill";
  return `${label} - Take ${takeNumber}.${extension}`;
}

// "name.ext" → "name (2).ext", "name (3).ext", … — for not overwriting an
// earlier download with the same name.
export function numberedFileName(fileName: string, n: number): string {
  if (n <= 1) return fileName;
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? `${fileName.slice(0, dot)} (${n})${fileName.slice(dot)}` : `${fileName} (${n})`;
}
