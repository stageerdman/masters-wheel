// Format-specific transcript parsers. Each parser either recognizes its
// shape and returns a ParsedTranscript, or returns null so the next format
// in the list (see index.ts) gets a turn. Add a new parser function here
// (and register it in FORMAT_PARSERS) when a new transcript tool's output
// needs support — the dispatch in index.ts doesn't change.

export type TranscriptMetaField = { key: string; value: string };

export type TranscriptEntry = {
  speaker: string;
  // `null` = the source had no timestamp for this block (e.g. a
  // single-speaker file from ~/dev/transcriber, which writes plain
  // paragraphs) — rendered as plain, unclickable text with no playback
  // highlight, never a made-up time.
  seconds: number | null;
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

function parseFrontmatter(raw: string): { meta: TranscriptMetaField[]; body: string } | null {
  const frontmatterMatch = raw.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!frontmatterMatch) return null;
  const meta: TranscriptMetaField[] = frontmatterMatch[1]
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const separator = line.indexOf(": ");
      if (separator === -1) return { key: line.trim(), value: "" };
      return { key: line.slice(0, separator).trim(), value: line.slice(separator + 2).trim() };
    });
  return { meta, body: raw.replace(/^\uFEFF/, "").slice(frontmatterMatch[0].length) };
}

// A speaker header at the start of a line: `**Speaker** [mm:ss]` (rest of
// the line, if any, is text), optionally tagged ` (interrupting)` the way
// ~/dev/transcriber marks overlapping speech — or a bare `**Speaker**`
// alone on its line (our own serialization of an untimed entry).
const V1_HEADER = /^\*\*([^*\n]+)\*\*(?:[ \t]*\[([^\]\n]+)\](?:[ \t]*\(interrupting\))?|[ \t]*\r?$)/gm;

// The "v1" shape: a `---`-delimited YAML-ish frontmatter block, followed by
// `**Speaker** [mm:ss]` headers each with one or more lines of text below
// them. Our own canonical shape (see serializeTranscript), and also what
// ~/dev/transcriber writes for a 2+ speaker recording.
function parseV1(raw: string): ParsedTranscript | null {
  const front = parseFrontmatter(raw);
  if (!front) return null;
  const { meta, body } = front;
  const headers = [...body.matchAll(V1_HEADER)];
  if (headers.length === 0) return null;

  const entries: TranscriptEntry[] = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    let seconds: number | null = null;
    if (header[2] !== undefined) {
      seconds = parseTimestampToSeconds(header[2]);
      if (seconds === null) continue;
    }
    const textStart = (header.index ?? 0) + header[0].length;
    const textEnd = i + 1 < headers.length ? headers[i + 1].index! : body.length;
    const text = body.slice(textStart, textEnd).trim();
    entries.push({ speaker: header[1].trim(), seconds, text });
  }
  if (entries.length === 0) return null;

  return { meta, entries };
}

// ~/dev/transcriber's single-speaker output (see its dialogue.py
// render_blocks_markdown): the same frontmatter, then plain
// blank-line-separated paragraphs — no speaker label, no timestamps. One
// untimed entry per paragraph. Only tried after parseV1, so a file with any
// real headers never lands here.
export const UNLABELED_SPEAKER = "Speaker";

function parseUntimedParagraphs(raw: string): ParsedTranscript | null {
  const front = parseFrontmatter(raw);
  if (!front) return null;
  const entries: TranscriptEntry[] = front.body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((text) => ({ speaker: UNLABELED_SPEAKER, seconds: null, text }));
  if (entries.length === 0) return null;
  return { meta: front.meta, entries };
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
// strictest; Fathom's looser line-based shape next; the untimed-paragraph
// fallback last, since any frontmatter'd text would satisfy it.
export const FORMAT_PARSERS: Array<(raw: string) => ParsedTranscript | null> = [
  parseV1,
  parseFathom,
  parseUntimedParagraphs,
];
