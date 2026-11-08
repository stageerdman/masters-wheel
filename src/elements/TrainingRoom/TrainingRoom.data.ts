// Shared types + per-tool-type glyph/color/label metadata for Training
// Room. Session metadata (and clip files) are real, on-disk storage via
// `src/lib/training` — see TrainingRoom.script.ts. See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/` for the roadmap.

import type { BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";

// Detail's content kinds — just Notes today (Voice Practicing's transcript
// already lives inline in the Hero feed). Still goes through the same
// generic SplitRail/useSplitRail primitive Performance Review uses, kept
// to a one-item kind set until a future training tool actually needs a
// second one — see `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`.
export type DetailContentKind = "notes";

export const DETAIL_CONTENT_KIND_ORDER: DetailContentKind[] = ["notes"];

export const DETAIL_CONTENT_KIND_META: Record<DetailContentKind, BookmarkMeta> = {
  notes: { label: "NT", color: "var(--color-bookmark-notes)" },
};

export type TrainingToolType = "voicePracticing";

// Every available tool, in the order they should list — just one today,
// scalable as more training tools get dictated.
export const TOOL_TYPE_ORDER: TrainingToolType[] = ["voicePracticing"];

// Fixed per session, driven entirely by its tool type — never user-
// adjustable (see Training Room's SessionListItem). Reuses
// --color-action-training-ground, the accent already set aside for this
// feature (see AppHeader's "Take it to the training ground" action).
export const TOOL_TYPE_META: Record<
  TrainingToolType,
  { glyph: string; color: string; label: string; description: string }
> = {
  voicePracticing: {
    glyph: "♪",
    color: "var(--color-action-training-ground)",
    label: "Voice Practicing",
    description: "Practice your delivery solo — upload clips, no real call attached.",
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
};
