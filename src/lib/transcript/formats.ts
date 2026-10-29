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

function parseTimestampToSeconds(raw: string): number | null {
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

export const FORMAT_PARSERS: Array<(raw: string) => ParsedTranscript | null> = [parseV1];
