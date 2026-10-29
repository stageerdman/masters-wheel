// Transcript parsing/serialization — format-agnostic on the outside
// (parseTranscript tries each known shape in turn, see formats.ts), but
// always normalizes to one canonical in-memory shape and one canonical
// on-disk shape (serializeTranscript), so every transcript on disk ends up
// timestamped the same way regardless of which tool produced it.

import { FORMAT_PARSERS, type ParsedTranscript, type TranscriptEntry } from "./formats";

export type { ParsedTranscript, TranscriptEntry, TranscriptMetaField } from "./formats";

export function parseTranscript(raw: string): ParsedTranscript | null {
  for (const parse of FORMAT_PARSERS) {
    const parsed = parse(raw);
    if (parsed) return parsed;
  }
  return null;
}

// Canonical mm:ss (or h:mm:ss past the one-hour mark) display — the
// "standardized version" every transcript gets rewritten to on import,
// regardless of how its source tool formatted timestamps.
export function formatTimestamp(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function serializeTranscript(parsed: ParsedTranscript): string {
  const frontmatter = parsed.meta.map(({ key, value }) => `${key}: ${value}`).join("\n");
  const body = parsed.entries
    .map((entry) => `**${entry.speaker}** [${formatTimestamp(entry.seconds)}]\n${entry.text}`)
    .join("\n\n");
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

export function speakersOf(parsed: ParsedTranscript): string[] {
  const seen = new Set<string>();
  const speakers: string[] = [];
  for (const entry of parsed.entries) {
    if (!seen.has(entry.speaker)) {
      seen.add(entry.speaker);
      speakers.push(entry.speaker);
    }
  }
  return speakers;
}

// Renames every entry spoken by `from` to `to` — used by the transcript
// UI's right-click rename, which then re-serializes and writes the result
// back to disk so the source file and the UI stay in sync.
export function renameSpeaker(parsed: ParsedTranscript, from: string, to: string): ParsedTranscript {
  if (from === to) return parsed;
  const entries: TranscriptEntry[] = parsed.entries.map((entry) =>
    entry.speaker === from ? { ...entry, speaker: to } : entry
  );
  return { ...parsed, entries };
}
