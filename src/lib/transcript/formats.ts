// Format-specific transcript parsers. Each parser either recognizes its
// shape and returns a ParsedTranscript, or returns null so the next format
// in the list (see index.ts) gets a turn. Add a new parser function here
// (and register it in FORMAT_PARSERS) when a new transcript tool's output
// needs support — the dispatch in index.ts doesn't change.

export type TranscriptMetaField = { key: string; value: string };

export type TranscriptEntry = {
  speaker: string;
  seconds: number;
  text: string;
};

export type ParsedTranscript = {
  meta: TranscriptMetaField[];
  entries: TranscriptEntry[];
};

export function parseTimestampToSeconds(raw: string): number | null {
  const parts = raw.trim().split(":");
  if (parts.length === 0 || parts.length > 3) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => Number.isNaN(value))) return null;
  let seconds = 0;
  for (const value of numbers) {
    seconds = seconds * 60 + value;
  }
  return seconds;
}

// The "v1" shape: a `---`-delimited YAML-ish frontmatter block, followed by
// `**Speaker** [mm:ss]` headers each with one or more lines of text below
// them (the format dictated in this update — see CLAUDE.md's transcript
// element convention notes).
function parseV1(raw: string): ParsedTranscript | null {
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!frontmatterMatch) return null;

  const meta: TranscriptMetaField[] = frontmatterMatch[1]
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const separator = line.indexOf(": ");
      if (separator === -1) return { key: line.trim(), value: "" };
      return { key: line.slice(0, separator).trim(), value: line.slice(separator + 2).trim() };
    });

  const body = raw.slice(frontmatterMatch[0].length);
  const headerPattern = /\*\*([^*]+)\*\*\s*\[([^\]]+)\]/g;
  const headers = [...body.matchAll(headerPattern)];
  if (headers.length === 0) return null;

  const entries: TranscriptEntry[] = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const seconds = parseTimestampToSeconds(header[2]);
    if (seconds === null) continue;
    const textStart = (header.index ?? 0) + header[0].length;
    const textEnd = i + 1 < headers.length ? headers[i + 1].index! : body.length;
    const text = body.slice(textStart, textEnd).trim();
    entries.push({ speaker: header[1].trim(), seconds, text });
  }
  if (entries.length === 0) return null;

  return { meta, entries };
}

// Fathom's own plain-text transcript — what its "Copy transcript" button
// puts on the clipboard and what a downloaded .txt contains (the same
// `plain_text` the share page's copy_transcript endpoint returns, see
// ~/dev/fathom-downloader/src/transcript.ts):
//
//   Weekly Sync - May 12
//   VIEW RECORDING - 45 mins (No highlights): https://fathom.video/share/abc
//
//   ---
//
//   0:00 - Jane Doe (Acme Inc)
//     Okay, let's get started.
//
// The title/VIEW RECORDING preamble is optional (a partial paste often
// starts straight at the first `m:ss - Speaker` line). The trailing
// `(Company)`/`(email)` parenthetical is dropped from the speaker name so
// the same person always reads as one speaker for color-coding and rename.
const FATHOM_HEADER = /^\s*@?(\d{1,2}(?::\d{2}){1,2})\s+-\s+(.+?)\s*$/;
const FATHOM_RECORDING_LINE = /^VIEW RECORDING\b.*?(https?:\/\/\S+)?\s*$/i;

function parseFathom(raw: string): ParsedTranscript | null {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const entries: TranscriptEntry[] = [];
  const preamble: string[] = [];
  let current: { speaker: string; seconds: number; lines: string[] } | null = null;

  function flush() {
    if (!current) return;
    const text = current.lines.map((line) => line.trim()).filter(Boolean).join(" ");
    if (text) entries.push({ speaker: current.speaker, seconds: current.seconds, text });
  }

  for (const line of lines) {
    const header = line.match(FATHOM_HEADER);
    const seconds = header ? parseTimestampToSeconds(header[1]) : null;
    if (header && seconds !== null) {
      flush();
      const speaker = header[2].replace(/\s*\([^()]*\)\s*$/, "").trim() || header[2].trim();
      current = { speaker, seconds, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim() !== "" && line.trim() !== "---") {
      preamble.push(line.trim());
    }
  }
  flush();
  if (entries.length === 0) return null;

  const meta: TranscriptMetaField[] = [{ key: "source", value: "fathom" }];
  for (const line of preamble) {
    const recording = line.match(FATHOM_RECORDING_LINE);
    if (recording) {
      if (recording[1]) meta.push({ key: "recording_url", value: recording[1] });
    } else if (!meta.some((field) => field.key === "title")) {
      meta.push({ key: "title", value: line });
    }
  }
  return { meta, entries };
}

// Order matters: v1 (our own canonical shape) first, since it's the
// strictest; Fathom's looser line-based shape only gets a turn after.
export const FORMAT_PARSERS: Array<(raw: string) => ParsedTranscript | null> = [parseV1, parseFathom];
