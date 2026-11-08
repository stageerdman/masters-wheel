// Shared types + per-discipline glyph/color/label metadata for Training
// Room. Session metadata (and clip files) are real, on-disk storage via
// `src/lib/training` — see TrainingRoom.script.ts. See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/` for the roadmap.

import type { BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";
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
export type TrainingToolType = "voiceTraining" | "chatRoleplay" | "voiceRoleplay" | "mindsetShifting";

// Every discipline, in the order DisciplinePicker lists them — Voice
// Training first since it's the only one actually built; the rest follow
// in the order they're expected to ship.
export const TOOL_TYPE_ORDER: TrainingToolType[] = ["voiceTraining", "chatRoleplay", "voiceRoleplay", "mindsetShifting"];

// Fixed per session, driven entirely by its discipline — never user-
// adjustable (see Training Room's SessionListItem). `locked` disciplines
// still render in DisciplinePicker (shown, not hidden, like a disabled nav
// item) but can't be selected yet. Voice Training reuses
// --color-action-training-ground, the accent already set aside for this
// whole feature (see AppHeader's "Take it to the training ground" action);
// the other three are genuinely new categories dictated for the picker —
// see --color-discipline-* in globals.css.
export const TOOL_TYPE_META: Record<
  TrainingToolType,
  { glyph: string; color: string; label: string; description: string; locked: boolean }
> = {
  voiceTraining: {
    glyph: "♪",
    color: "var(--color-action-training-ground)",
    label: "Voice Training",
    description: "Listen to the voice of the person you want to sound like, then repeat it back the same way.",
    locked: false,
  },
  chatRoleplay: {
    glyph: "❝",
    color: "var(--color-discipline-chat-roleplay)",
    label: "Chat Roleplay",
    description: "Type your way through a conversation with an AI prospect and see how your wording lands.",
    locked: false,
  },
  voiceRoleplay: {
    glyph: "☏",
    color: "var(--color-discipline-voice-roleplay)",
    label: "Voice Roleplay",
    description: "Speak live against an AI prospect that pushes back in real time, no script to lean on.",
    locked: true,
  },
  mindsetShifting: {
    glyph: "✦",
    color: "var(--color-discipline-mindset-shifting)",
    label: "Mindset Shifting",
    description: "Reframe the story you tell yourself before a call, not just the words you say.",
    locked: true,
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
  // Performance Review's transcriptRaw.
  transcriptRaw: string | null;
  isGeneratingTranscript: boolean;
};

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
};
