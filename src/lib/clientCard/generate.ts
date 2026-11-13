// Real Client Card generation — same no-API-key, shell-out-to-the-user's-
// own-local-`claude`-CLI pattern as scorecard and question analysis (see
// src/lib/scorecard/generate.ts, src-tauri/src/claude_cli.rs). Uses the
// default model, not the cheap override question analysis uses: reading
// between the lines of a call (what they're avoiding, why it hasn't been
// fixed) is a judgment job, not a mechanical extraction.
//
// Output format: plain labeled lines, not JSON — same empirically more
// reliable choice the other generators made. A missing label just leaves
// that field empty rather than failing the whole card.

import { invoke } from "@tauri-apps/api/core";
import type { ClientCard, ClientCardField } from "./index.ts";

const LABELS: Record<ClientCardField, string> = {
  problem: "PROBLEM",
  avoiding: "AVOIDING",
  whyNow: "WHY_NOW",
  ifNotResolved: "IF_NOT_RESOLVED",
  whyNotYet: "WHY_NOT_YET",
  offered: "OFFERED",
  nextStep: "NEXT_STEP",
};

function buildClientCardPrompt(businessDescription: string): string {
  return `You are writing a short "client card" that sums up a prospect's situation from a sales call transcript (sent as the next message), so the salesperson can pick the deal back up at a glance.

What the salesperson's business sells:
${businessDescription.trim() || "(not specified)"}

Answer each point about the PROSPECT (not the salesperson), based only on what was actually said or clearly implied on the call. Be concrete and specific to this person — use their own details, numbers, and words where possible. One to three sentences each. If the call genuinely doesn't reveal something, write "Not discussed".

Always write the answers in the same language the transcript itself is written in — never translate, even though these instructions are in English.

Output EXACTLY these seven lines, each on a single line, in this order, and nothing else — no preamble, no markdown, no code fences:

PROBLEM: <what their problem is>
AVOIDING: <what they are trying to avoid — the outcome or pain they fear>
WHY_NOW: <why they need to resolve it right now>
IF_NOT_RESOLVED: <what happens if they can't resolve it>
WHY_NOT_YET: <why they haven't resolved it already>
OFFERED: <what the salesperson offered them — product, package, price, terms>
NEXT_STEP: <the next step both sides agreed on, with any date or time mentioned>`;
}

// Same scan-for-first-matching-line tolerance as the other generators.
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

export function parseClientCardReply(raw: string): Record<ClientCardField, string> | null {
  const fields = {} as Record<ClientCardField, string>;
  let found = 0;
  for (const [key, label] of Object.entries(LABELS) as [ClientCardField, string][]) {
    const value = extractLabel(raw, label);
    if (value) found++;
    fields[key] = value ?? "";
  }
  return found === 0 ? null : fields;
}

export async function generateClientCard(businessDescription: string, transcriptRaw: string): Promise<ClientCard> {
  const raw = await invoke<string>("run_claude_once", {
    systemPrompt: buildClientCardPrompt(businessDescription),
    message: transcriptRaw,
  });
  const fields = parseClientCardReply(raw);
  if (!fields) {
    throw new Error("Claude didn't return a client card — try generating again.");
  }
  return { generatedAt: new Date().toISOString(), ...fields };
}
