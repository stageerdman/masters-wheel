// Generate Transcript: detect a source file's audio tracks, transcribe
// whichever the user kept via ElevenLabs cloud Speech-to-Text (the Rust
// side of this — src-tauri/src/transcribe.rs — shells out to
// ffprobe/ffmpeg/curl), then merge the per-track words into pause-based,
// speaker-labeled dialogue blocks. This is the same process
// ~/dev/transcriber follows (see that project's src/audio_tracks.py and
// src/dialogue.py) ported here as plain TS rather than reused as a
// separate Python process — this app's own stack, nothing extra to run.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type DetectedTrack = { index: number; title: string | null };

export async function detectAudioTracks(sourcePath: string): Promise<DetectedTrack[]> {
  return invoke<DetectedTrack[]>("probe_audio_tracks", { sourcePath });
}

type Word = { start: number; end: number; text: string; leadSpace: boolean };

export type TrackSelection = { index: number; name: string };

type TrackTranscript = { index: number; name: string; words: Word[] };

// Thrown by transcribeTracks when the job was stopped via
// cancelGenerateTranscript — distinct from a real failure so the caller can
// treat it as a quiet no-op rather than an error to show.
export const GENERATE_CANCELLED = "__cancelled__";

export async function transcribeTracks(
  jobId: string,
  sourcePath: string,
  tracks: TrackSelection[]
): Promise<TrackTranscript[]> {
  return invoke<TrackTranscript[]>("generate_transcript", { jobId, sourcePath, tracks });
}

export async function cancelGenerateTranscript(jobId: string): Promise<void> {
  await invoke("cancel_generate_transcript", { jobId });
}

export type GenerateTranscriptProgress = {
  jobId: string;
  stage: "extracting" | "uploading";
  trackIndex: number;
  trackCount: number;
  trackName: string;
};

// Subscribes to progress for every in-flight job (the Rust side emits one
// global event); the caller filters by `jobId` itself since a listener is
// cheap and simpler than a per-job channel. Returns the unlisten function.
export async function onGenerateTranscriptProgress(
  callback: (progress: GenerateTranscriptProgress) => void
): Promise<() => void> {
  return listen<GenerateTranscriptProgress>("generate-transcript-progress", (event) => callback(event.payload));
}

type Block = { speaker: string; start: number; end: number; text: string; interrupting: boolean; words: Word[] };

function joinWords(words: Word[]): string {
  let out = "";
  words.forEach((word, index) => {
    if (index > 0 && word.leadSpace) out += " ";
    out += word.text;
  });
  return out.trim();
}

// ElevenLabs returns one flat per-word stream per track, not sentences —
// group it into segments on a pause or right after sentence-ending
// punctuation, same gap/rule as transcriber's `_coalesce_elevenlabs_words`.
const SEGMENT_GAP_SECONDS = 0.6;

function coalesceIntoSegments(speaker: string, words: Word[]): Block[] {
  const segments: Block[] = [];
  let current: Word[] = [];
  for (const word of words) {
    const last = current[current.length - 1];
    if (
      last &&
      (word.start - last.end > SEGMENT_GAP_SECONDS || /[.!?]$/.test(last.text.trimEnd()))
    ) {
      segments.push(buildSegment(speaker, current));
      current = [];
    }
    current.push(word);
  }
  if (current.length) segments.push(buildSegment(speaker, current));
  return segments;
}

function buildSegment(speaker: string, words: Word[]): Block {
  return {
    speaker,
    start: words[0].start,
    end: words[words.length - 1].end,
    text: joinWords(words),
    interrupting: false,
    words,
  };
}

// Merges every track's segments into chronological dialogue blocks, same
// rule as transcriber's `merge_segments_into_blocks`: with 2+ speakers
// present, same-speaker segments always merge into the current block
// (a real turn, however long); with only one speaker, segments merge only
// when the gap between them is short (plain pause-based paragraphs). A
// block that starts before the previous one ended is flagged as an
// interruption.
const PAUSE_SECONDS = 0.8;

function mergeSegmentsIntoBlocks(segments: Block[]): Block[] {
  const ordered = segments.filter((segment) => segment.text.trim()).sort((a, b) => a.start - b.start);
  const multiSpeaker = new Set(ordered.map((segment) => segment.speaker)).size > 1;

  const blocks: Block[] = [];
  for (const segment of ordered) {
    const last = blocks[blocks.length - 1];
    if (last) {
      const gap = segment.start - last.end;
      const sameSpeaker = segment.speaker === last.speaker;
      if (sameSpeaker && (multiSpeaker || gap <= PAUSE_SECONDS)) {
        last.words.push(...segment.words);
        last.text = joinWords(last.words);
        last.end = Math.max(last.end, segment.end);
        continue;
      }
    }
    blocks.push({ ...segment, words: [...segment.words] });
  }

  blocks.forEach((block, index) => {
    block.interrupting = index > 0 && block.start < blocks[index - 1].end;
  });

  return blocks;
}

// A record's live Generate Transcript state, as tracked by
// PerformanceReview.script.ts's per-record `generationByRecord` and
// rendered by Transcript/children/TranscriptGenerating in place of the
// usual upload/generate prompt.
export type TranscriptGenerationState =
  | { status: "running"; jobId: string; stage: "extracting" | "uploading"; trackIndex: number; trackCount: number; trackName: string }
  | { status: "error"; message: string; sourcePath: string; selections: TrackSelection[] };

export type DialogueEntry = { speaker: string; seconds: number; text: string };

// The one entry point this module exposes to the UI: per-track words in,
// chronological speaker-labeled entries out — ready to drop straight into
// a ParsedTranscript (see ./index.ts's serializeTranscript).
export function tracksToDialogueEntries(tracks: TrackTranscript[]): DialogueEntry[] {
  const segments = tracks.flatMap((track) => coalesceIntoSegments(track.name, track.words));
  const blocks = mergeSegmentsIntoBlocks(segments);
  return blocks.map((block) => ({ speaker: block.speaker, seconds: block.start, text: block.text }));
}
