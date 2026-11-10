// Shared types + per-discipline glyph/color/label metadata for Training
// Room. Session metadata (and clip files) are real, on-disk storage via
// `src/lib/training` — see TrainingRoom.script.ts. See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/` for the roadmap.

import type { BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";
import { parseWordTimings } from "@/lib/training";
import type { DiarizedWord } from "@/lib/transcript/generate";
import type { RoleplayState } from "./children/ChatRoleplaySession/ChatRoleplaySession.data";

// Detail's content kinds. Voice Training still only ever shows "notes"
// (its transcript already lives inline in the Hero feed) — the second
// kind, "trainer", exists for Chat Roleplay's own Detail
// (ChatRoleplaySession/children/RoleplayDetail), which needs a real AI
// Trainer pane above Notes. Both go through the same generic
// SplitRail/useSplitRail primitive Performance Review uses — Chat
// Roleplay is simply the "future discipline" the single-kind comment
// below used to wait for; see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`.
export type DetailContentKind = "notes" | "trainer";

// Voice Training's Detail — unchanged, still just Notes.
export const DETAIL_CONTENT_KIND_ORDER: DetailContentKind[] = ["notes"];

// Chat Roleplay's Detail — AI Trainer pinned above Notes.
export const CHAT_ROLEPLAY_DETAIL_KIND_ORDER: DetailContentKind[] = ["trainer", "notes"];

export const DETAIL_CONTENT_KIND_META: Record<DetailContentKind, BookmarkMeta> = {
  notes: { label: "NT", color: "var(--color-bookmark-notes)" },
  trainer: { label: "AI", color: "var(--color-bookmark-ai)" },
};

// A session's discipline — picked once, up front, in DisciplinePicker
// (see its children/DisciplineFrame). "voicePracticing" was this type's
// original single value, renamed to "voiceTraining" once more disciplines
// joined it — TrainingRoom.script.ts's normalizeToolType() still maps a
// session.json written under the old name to the new one on load.
export type TrainingToolType = "voiceTraining" | "chatRoleplay" | "voiceRoleplay" | "mindsetShifting" | "learning";

// Every discipline, in the order DisciplinePicker lists them — Voice
// Training first since it's the only one actually built; the rest follow
// in the order they're expected to ship.
export const TOOL_TYPE_ORDER: TrainingToolType[] = [
  "voiceTraining",
  "chatRoleplay",
  "voiceRoleplay",
  "mindsetShifting",
  "learning",
];

// Fixed per session, driven entirely by its discipline — never user-
// adjustable (see Training Room's SessionListItem). `locked` disciplines
// still render in DisciplinePicker (shown, not hidden, like a disabled nav
// item) but can't be selected yet. Voice Training reuses
// --color-action-training-ground, the accent already set aside for this
// whole feature (see AppHeader's "Take it to the training ground" action);
// the other three are genuinely new categories dictated for the picker —
// see --color-discipline-* in globals.css.
// No `glyph` field — SessionListItem/TagChip render the real icon via
// DisciplineIcon (src/elements/DisciplineIcon), the same artwork as
// DisciplinePicker's crest for this discipline (see DISCIPLINE_SHAPES).
export const TOOL_TYPE_META: Record<
  TrainingToolType,
  { color: string; label: string; description: string; locked: boolean }
> = {
  voiceTraining: {
    color: "var(--color-action-training-ground)",
    label: "Voice Training",
    description: "Listen to the voice of the person you want to sound like, then repeat it back the same way.",
    locked: false,
  },
  chatRoleplay: {
    color: "var(--color-discipline-chat-roleplay)",
    label: "Chat Roleplay",
    description: "Type your way through a conversation with an AI prospect and see how your wording lands.",
    locked: false,
  },
  voiceRoleplay: {
    color: "var(--color-discipline-voice-roleplay)",
    label: "Voice Roleplay",
    description: "Speak live against an AI prospect that pushes back in real time, no script to lean on.",
    locked: true,
  },
  mindsetShifting: {
    color: "var(--color-discipline-mindset-shifting)",
    label: "Mindset Shifting",
    description: "Reframe the story you tell yourself before a call, not just the words you say.",
    locked: false,
  },
  learning: {
    color: "var(--color-discipline-learning)",
    label: "Learning",
    description: "Upload anything worth studying — a recording, a PDF, a book — and build your own notes around it.",
    locked: false,
  },
};

export type SessionStatus = "open" | "closed";

export type ClipKind = "video" | "audio";

export type TrainingClip = {
  id: string;
  kind: ClipKind;
  // Playable convertFileSrc URL, built from the clip's real on-disk copy
  // (see src/lib/training).
  src: string;
  // The original file's display name, shown in the UI.
  fileName: string;
  // The on-disk, timestamp-prefixed name of the stored copy inside this
  // session's training/<id>/ folder — needed to rebuild `src` when a
  // persisted session is reloaded from disk. Not shown anywhere in the UI.
  storedFileName: string;
  // Raw transcript.md-shaped text, or null until "Generate transcript" has
  // been run for this clip. Parsed on demand (src/lib/transcript), same as
  // Performance Review's transcriptRaw. Live generation progress/errors for
  // a clip aren't persisted here — see TrainingRoom.script.ts's
  // generationByClip, same "ephemeral, job-tracked" shape as Performance
  // Review's generationByRecord.
  transcriptRaw: string | null;
  // ElevenLabs' real per-word timestamps behind transcriptRaw — see
  // StoredClipMeta's own comment in src/lib/training. `null` until
  // generated, or for a clip transcribed before this field existed (falls
  // back to LyricsTranscript's even-split approximation).
  wordTimings: DiarizedWord[] | null;
  // Which "Generate transcript" choice produced transcriptRaw — see
  // StoredClipMeta's own comment in src/lib/training.
  diarize: boolean | null;
};

// Learning's own file kind — "document" (pdf/epub) is store-and-download
// only, never played back or transcribed (see LearningFile.transcriptRaw).
export type LearningFileKind = "video" | "audio" | "document";

export type LearningFile = {
  id: string;
  kind: LearningFileKind;
  // Playable/downloadable convertFileSrc URL, built from the file's real
  // on-disk copy (see src/lib/training).
  src: string;
  // The original file's display name, shown in the UI.
  fileName: string;
  // The on-disk, timestamp-prefixed name of the stored copy — needed to
  // rebuild `src`/the download path when a persisted session reloads.
  storedFileName: string;
  // Lowercased, no leading dot — drives the document chip's icon label.
  extension: string;
  // Real on-disk size, shown on a document's chip (video/audio don't show
  // this — their player already communicates duration).
  sizeBytes: number;
  // video/audio only; always null for "document" — PDF/EPUB text
  // extraction is explicitly future work, not this phase.
  transcriptRaw: string | null;
  // Same real per-word timing as TrainingClip's own wordTimings — shared
  // generateTranscript call, same shape.
  wordTimings: DiarizedWord[] | null;
  // Same as TrainingClip's own diarize.
  diarize: boolean | null;
};

// One ordered block of Learning's single notes document — "single" per
// session.json (see src/lib/training), but rendered as if each uploaded
// file had its own notes underneath it, Word-doc-with-inline-images style.
// A "media" block is immutable (just a pointer to a LearningFile); a
// "text" block is the user's own free-written notes around it. Uploading
// a file always unshifts a fresh {media, text} pair onto the very front
// of LearningState.blocks — block[0] is therefore always a media block,
// the invariant LearningHero's pin-to-top behavior relies on.
export type LearningBlock =
  | { id: string; kind: "media"; fileId: string }
  | { id: string; kind: "text"; content: string };

export type LearningState = {
  files: LearningFile[];
  blocks: LearningBlock[];
  // Session-wide toggle (see this update's wiki.md): pinned keeps
  // blocks[0]'s media fixed at the top of the Hero column while
  // blocks.slice(1) scrolls independently underneath; off scrolls the
  // whole column as one normal feed.
  pinTopMedia: boolean;
  // Which file LearningDetail currently shows transcript controls (or a
  // download/file-info panel) for — defaults to the newest file on
  // upload, otherwise whichever media block was last clicked.
  selectedFileId: string | null;
};

export function emptyLearningState(): LearningState {
  return { files: [], blocks: [], pinTopMedia: false, selectedFileId: null };
}

function isLearningFileKind(value: unknown): value is LearningFileKind {
  return value === "video" || value === "audio" || value === "document";
}

// `src` is never trusted from disk (same reasoning as TrainingClip's own
// storedFileName/src split) — parsed as "" here and rebuilt from
// storedFileName by TrainingRoom.script.ts's learningStateFromMeta right
// after this runs.
function parseLearningFile(raw: unknown): LearningFile | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LearningFile>;
  if (
    typeof candidate.id !== "string" ||
    !isLearningFileKind(candidate.kind) ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.storedFileName !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    kind: candidate.kind,
    src: "",
    fileName: candidate.fileName,
    storedFileName: candidate.storedFileName,
    extension: typeof candidate.extension === "string" ? candidate.extension : "",
    sizeBytes: typeof candidate.sizeBytes === "number" ? candidate.sizeBytes : 0,
    transcriptRaw: typeof candidate.transcriptRaw === "string" ? candidate.transcriptRaw : null,
    wordTimings: parseWordTimings(candidate.wordTimings),
    diarize: typeof candidate.diarize === "boolean" ? candidate.diarize : null,
  };
}

function isLearningBlock(raw: unknown): raw is LearningBlock {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as { id?: unknown; kind?: unknown; fileId?: unknown; content?: unknown };
  if (typeof candidate.id !== "string") return false;
  if (candidate.kind === "media") return typeof candidate.fileId === "string";
  if (candidate.kind === "text") return typeof candidate.content === "string";
  return false;
}

// Same "missing/corrupt is just absent, not a crash" tolerance as
// parseRoleplayState above and src/lib/training's own parseMeta.
export function parseLearningState(raw: unknown): LearningState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LearningState>;
  const files = Array.isArray(candidate.files)
    ? candidate.files.map(parseLearningFile).filter((file): file is LearningFile => file !== null)
    : [];
  const blocks = Array.isArray(candidate.blocks) ? candidate.blocks.filter(isLearningBlock) : [];
  return {
    files,
    blocks,
    pinTopMedia: typeof candidate.pinTopMedia === "boolean" ? candidate.pinTopMedia : false,
    selectedFileId: typeof candidate.selectedFileId === "string" ? candidate.selectedFileId : null,
  };
}

export type TrainingSession = {
  id: string;
  toolType: TrainingToolType;
  // User-editable, click-to-rename like Performance Review's record title.
  name: string;
  status: SessionStatus;
  // Drives both the Navigation list's relative-date label and its Open-
  // Sessions ordering. Bumped only on a real content edit (notes text,
  // adding a clip) — never on merely opening/selecting the session.
  lastUpdatedAt: string;
  // Newest first — the scrollable feed shown in Hero.
  clips: TrainingClip[];
  notes: string;
  // Chat Roleplay's own persisted state — null for every other discipline,
  // and for a not-yet-set-up Chat Roleplay session.
  roleplay: RoleplayState | null;
  // Learning's own persisted state — null for every other discipline.
  learning: LearningState | null;
};
