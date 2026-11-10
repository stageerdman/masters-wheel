// Real question-analysis generation — same no-API-key, shell-out-to-the-
// user's-own-local-`claude`-CLI pattern as scorecard generation (see
// src/lib/scorecard/generate.ts and src-tauri/src/claude_cli.rs). Deliber-
// ately uses a cheap/simple model+effort override (haiku, low) rather than
// the default session model: this is a mechanical extraction job, not a
// judgment call, so it doesn't need deep reasoning or the default model's
// cost.
//
// Output format: plain labeled lines, not JSON content — same choice
// scorecard/generate.ts already made and documented (empirically more
// reliable than asking the model to emit JSON). Each block is parsed
// defensively: a malformed or missing field just skips that pair, never
// throws — same tolerance convention as every other parser in this app.

import { invoke } from "@tauri-apps/api/core";
import { parseTimestampToSeconds } from "@/lib/transcript";
import type { QuestionAnalysis, QuestionAnswerPair } from "./index";

const CHEAP_MODEL = "haiku";
const CHEAP_EFFORT = "low";

function buildQuestionAnalysisPrompt(transcriptRaw: string): { systemPrompt: string; message: string } {
  const systemPrompt = `You are extracting a clean record of questions and answers from a sales call transcript.

Go through the whole transcript and find EVERY genuine question the salesperson (not the prospect) asked trying to learn something about the prospect, their situation, or their needs — not rhetorical filler, not "does that make sense?"-style check-ins. The way it was actually asked is often messy: rambling, restated several times, or split across more than one turn. The answer is often long, meandering, or spread across several replies.

For each one, output a clean, single-sentence version of the question (as if the salesperson had asked it crisply the first time), and a clean, short outcome of the answer — the actual useful takeaway, not a transcript of what was said.

Always write the QUESTION and ANSWER text in the same language the transcript itself is written in — never translate it, even though these instructions are in English. If the transcript switches languages mid-call, match whichever language that specific question/answer happened in.

The transcript (sent as the next message) is already timestamped per line as [mm:ss] or [h:mm:ss] — use the exact timestamp on the line where the question was first asked.

For EVERY question found, in the order they occurred, output a block in EXACTLY this format:

QUESTION: <clean question, one sentence, on a single line>
ANSWER: <clean outcome, one or two sentences, on a single line>
TIMESTAMP: <the mm:ss moment the question was asked, or "none" if you can't place it>

Output nothing else — no preamble, no numbering, no markdown headings, no code fences. If there are truly no real questions, output nothing.`;

  return { systemPrompt, message: transcriptRaw };
}

// Same scan-for-first-matching-line tolerance as scorecard/generate.ts's
// own copy (itself matching Rust's extract_label in roleplay.rs/claude_cli.rs).
function extractLabel(text: string, label: string): string | null {
  const prefix = `${label}:`;
  for (const line of text.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return null;
}

function parseTimestamp(raw: string | null): number | null {
  if (!raw || raw.trim().toLowerCase() === "none") return null;
  return parseTimestampToSeconds(raw.trim());
}

function parseQuestionAnalysisReply(raw: string): QuestionAnswerPair[] {
  const blocks = raw.split(/^QUESTION:/m).slice(1);
  const pairs: QuestionAnswerPair[] = [];
  for (const body of blocks) {
    const block = `QUESTION:${body}`;
    const question = extractLabel(block, "QUESTION");
    const answer = extractLabel(block, "ANSWER");
    if (!question || !answer) continue;
    pairs.push({ question, answer, timestampSeconds: parseTimestamp(extractLabel(block, "TIMESTAMP")) });
  }
  return pairs;
}

export async function generateQuestionAnalysis(transcriptRaw: string): Promise<QuestionAnalysis> {
  const { systemPrompt, message } = buildQuestionAnalysisPrompt(transcriptRaw);
  const raw = await invoke<string>("run_claude_once", { systemPrompt, message, model: CHEAP_MODEL, effort: CHEAP_EFFORT });
  const pairs = parseQuestionAnalysisReply(raw);
  if (pairs.length === 0) {
    throw new Error("Claude didn't find any questions — try generating again.");
  }
  return { generatedAt: new Date().toISOString(), pairs };
}
