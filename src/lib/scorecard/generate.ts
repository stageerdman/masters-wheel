// Real scorecard generation — shells out (via the Rust `run_claude_once`
// command, src-tauri/src/claude_cli.rs) to the user's own authenticated
// local `claude` CLI, the same no-API-key pattern `assistant.rs`/
// `roleplay.rs` already use. No Anthropic API key anywhere in this app.
//
// Output format: plain labeled lines, not JSON content — same choice
// `roleplay.rs` already made and documented (empirically more reliable
// than asking the model to emit JSON). Every criterion block and the
// trailing summary/improvement fields are parsed defensively: a
// malformed or missing field is just skipped, never throws — same
// tolerance convention as every other parser in this app. Rust stays a
// dumb transport layer; all scorecard-shape/rubric knowledge and the
// reply parser live here, not duplicated into Rust.

import { invoke } from "@tauri-apps/api/core";
import { parseTimestampToSeconds } from "@/lib/transcript";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { SCORECARD_RATING_ORDER, SCORECARD_RATING_META, type Scorecard, type ScorecardItem } from "./index";

const RUBRIC_TEXT = SCORECARD_RATING_ORDER.map(
  (rating) => `${rating} ${SCORECARD_RATING_META[rating].label} - ${SCORECARD_RATING_META[rating].description}`
).join("\n");

function buildScorecardPrompt(
  criteria: ScorecardCriterionDef[],
  businessDescription: string,
  transcriptRaw: string
): { systemPrompt: string; message: string } {
  const criteriaBlock = criteria
    .map((criterion, index) => `${index + 1}. id="${criterion.id}" name="${criterion.name}"\n   What to look for: ${criterion.prompt}`)
    .join("\n");

  const systemPrompt = `You are a sales-call analyst. Score a recorded sales call's transcript against a fixed set of criteria, using exactly this rubric:

${RUBRIC_TEXT}

What the business sells (ground your analysis in this, not a generic example):
${businessDescription.trim() || "(not specified)"}

Score the call against EXACTLY these criteria, in this order, using each one's own definition of what to look for:
${criteriaBlock}

The transcript (sent as the next message) is already timestamped per line as [mm:ss] or [h:mm:ss] — when you cite a moment, use the exact timestamp shown on that line.

For EVERY criterion listed above, in the same order, output a block in EXACTLY this format:

CRITERION: <the id exactly as given above>
RATING: <0, 1, 2, 3, or 4>
TIMESTAMPS: <comma-separated mm:ss moments where this happened, or "none" if Skipped with nothing to point at — more than one moment is expected for a criterion that recurs, e.g. several objections>
REASONING: <one paragraph, on a single line with no line breaks, explaining why this score — may reference moments inline as [mm:ss]>

After every criterion block, output a line containing only ===, then:

SUMMARY: <one short paragraph summarizing the whole call, on a single line>
IMPROVEMENT: <one short paragraph: the single highest-leverage thing to improve next time, on a single line>

Output nothing else — no preamble, no markdown headings, no code fences.`;

  return { systemPrompt, message: transcriptRaw };
}

// Same scan-for-first-matching-line tolerance as Rust's extract_label in
// src-tauri/src/roleplay.rs/claude_cli.rs.
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

function parseRating(raw: string | null): ScorecardItem["rating"] | null {
  if (raw === null) return null;
  const value = Number(raw.trim());
  return (SCORECARD_RATING_ORDER as number[]).includes(value) ? (value as ScorecardItem["rating"]) : null;
}

function parseTimestampList(raw: string | null): number[] {
  if (!raw || raw.trim().toLowerCase() === "none") return [];
  return raw
    .split(",")
    .map((token) => parseTimestampToSeconds(token.trim()))
    .filter((value): value is number => value !== null);
}

// Splits the whole reply on a line that is exactly "===" into the
// criteria section and the trailing summary/improvement section. No
// separator found (a malformed reply) just means the tail is empty —
// summary/improvement default to "" rather than throwing.
function splitOnSeparator(raw: string): [string, string] {
  const lines = raw.split("\n");
  const index = lines.findIndex((line) => line.trim() === "===");
  if (index === -1) return [raw, ""];
  return [lines.slice(0, index).join("\n"), lines.slice(index + 1).join("\n")];
}

function parseScorecardReply(
  raw: string,
  criteria: ScorecardCriterionDef[]
): Pick<Scorecard, "items" | "summary" | "improvementSuggestion"> {
  const [criteriaSection, tailSection] = splitOnSeparator(raw);
  const blocks = criteriaSection.split(/^CRITERION:/m).slice(1);

  const items: ScorecardItem[] = [];
  for (const body of blocks) {
    const block = `CRITERION:${body}`;
    const criterionId = extractLabel(block, "CRITERION");
    if (!criterionId || !criteria.some((candidate) => candidate.id === criterionId)) continue;
    const rating = parseRating(extractLabel(block, "RATING"));
    if (rating === null) continue;
    items.push({
      criterion: criterionId,
      rating,
      reasoning: extractLabel(block, "REASONING") ?? "",
      timestamps: parseTimestampList(extractLabel(block, "TIMESTAMPS")),
    });
  }

  return {
    items,
    summary: extractLabel(tailSection, "SUMMARY") ?? "",
    improvementSuggestion: extractLabel(tailSection, "IMPROVEMENT") ?? "",
  };
}

export async function generateScorecard(
  allCriteria: ScorecardCriterionDef[],
  businessDescription: string,
  transcriptRaw: string
): Promise<Scorecard> {
  // ScorePanel always keeps one trailing blank row so there's somewhere
  // to type the next score — that's purely a Settings-UI affordance, not
  // a real criterion, and must never be scored or sent to the model.
  const criteria = allCriteria.filter((criterion) => criterion.name.trim() !== "" && criterion.prompt.trim() !== "");
  const { systemPrompt, message } = buildScorecardPrompt(criteria, businessDescription, transcriptRaw);
  const raw = await invoke<string>("run_claude_once", { systemPrompt, message });
  const { items, summary, improvementSuggestion } = parseScorecardReply(raw, criteria);
  if (items.length === 0) {
    throw new Error("Claude's reply didn't match the expected format — try generating again.");
  }
  return { generatedAt: new Date().toISOString(), items, summary, improvementSuggestion };
}
