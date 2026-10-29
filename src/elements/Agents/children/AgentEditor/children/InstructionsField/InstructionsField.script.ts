import type { KnowledgeFile } from "@/elements/Agents/Agents.data";

export type InstructionPart = { text: string; file: KnowledgeFile | null };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits instructions text around "@Filename" occurrences so a knowledge-
// file reference can render as a styled tag once the field is blurred —
// same shape as the AI Assistant's Message.script.ts splitMentions,
// scoped to this agent's knowledge files instead of chat agents. A
// reference to a file that's since been removed simply doesn't match and
// stays plain text (see this update's wiki.md).
export function splitFileMentions(text: string, files: KnowledgeFile[]): InstructionPart[] {
  if (files.length === 0) return [{ text, file: null }];

  const pattern = new RegExp(`@(${files.map((file) => escapeRegExp(file.name)).join("|")})\\b`, "g");
  const parts: InstructionPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), file: null });
    }
    const file = files.find((candidate) => candidate.name === match![1]) ?? null;
    parts.push({ text: match[0], file });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), file: null });
  }

  return parts;
}

// Matches a knowledge file by any substring of its name (not just the
// start) — filenames are recalled by a distinctive word, not necessarily
// the first letters, unlike the AI Assistant's short agent-name list.
export function matchFileMention(file: KnowledgeFile, query: string) {
  return file.name.toLowerCase().includes(query.toLowerCase());
}
