// Per-Space settings — plain TS, no React, same tolerant-parse shape as
// src/lib/training and src/lib/records. One `settings.json` directly under
// the Space's own folder (sibling to agents/chats/records/training), since
// there's exactly one of these per Space, not a collection of folders.

import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { BASE_DIR, spaceDir } from "@/lib/spaces/paths";
import { getActiveSpaceFolder } from "@/lib/spaces/activeSpaceStore";

const SETTINGS_FILE_NAME = "settings.json";

function settingsPath(): string {
  return `${spaceDir(getActiveSpaceFolder())}/${SETTINGS_FILE_NAME}`;
}

// One scoring criterion a call gets rated against — `id` is an opaque,
// stable token (never derived from `name`) so renaming a score never
// orphans a historical scorecard.json that still references its id by
// that id. `name`/`prompt` are exactly what the Settings page's Score
// rows let the user edit.
export type ScorecardCriterionDef = {
  id: string;
  name: string;
  prompt: string;
};

export type SpaceSettings = {
  businessDescription: string;
  scorecardCriteria: ScorecardCriterionDef[];
};

// Seeded with the 11 criteria this app shipped with before scoring
// criteria became user-editable — same ids as the old fixed
// ScorecardCriterionId union, so scorecard.json files written before this
// change keep resolving to the same criteria with zero migration.
function defaultScorecardCriteria(): ScorecardCriterionDef[] {
  return [
    {
      id: "frameSetting",
      name: "Frame Setting",
      prompt:
        "It's clear what the client can expect from the call: what areas get covered, what result they'll have by the end, and that a decision can be made today.",
    },
    {
      id: "discoveryProblemAnchor",
      name: "Discovery — Problem Anchor",
      prompt:
        "A problem is clearly, explicitly named by the client — ideally the first thing asked in discovery — and repeated back to confirm it.",
    },
    {
      id: "discoveryCurrentState",
      name: "Discovery — Current State",
      prompt:
        "The contextual environment of the problem: how long it's lasted, what's been tried, what worked or didn't, and whether this is even solvable here.",
    },
    {
      id: "discoveryProblemImpacts",
      name: "Discovery — Problem Impacts",
      prompt:
        "How the problem actually shows up day to day — relationships, work, self-esteem — and what frustrates the client most about it.",
    },
    {
      id: "discoveryIdealGoal",
      name: "Discovery — Ideal Goal",
      prompt:
        "What the client truly wants to achieve — a number or stated goal, the emotion underneath why it matters, and the impact reaching it would have.",
    },
    {
      id: "discoveryConsequences",
      name: "Discovery — Consequences",
      prompt:
        "What happens if this problem just continues — what the client is afraid of, and why resolving it now instead of later actually matters.",
    },
    {
      id: "discoveryWhyNow",
      name: "Discovery — Why Now",
      prompt:
        "Whether the client is ready to start today, and the emotional reason they want to start now rather than wait any longer.",
    },
    {
      id: "summary",
      name: "Summary",
      prompt:
        "Shows the client their situation was understood and processed, ending with a real check — \"did I get that right?\" — not just a replay of what they said.",
    },
    {
      id: "solution",
      name: "Solution",
      prompt:
        "Presents the solution with no hedging, using the client's own words, in up to 3 pillars that map directly to what they said they want.",
    },
    {
      id: "closing",
      name: "Closing",
      prompt:
        "Leads the client to a decision right now — surfacing hesitations before the price, then stating the price plainly, with no extra talk around it.",
    },
    {
      id: "resolvingLimitation",
      name: "Resolving Limitation",
      prompt:
        "Catching objections, doubts, or contradictions the moment they appear and actually resolving them — not just noticing and moving past them.",
    },
  ];
}

function defaultSettings(): SpaceSettings {
  return { businessDescription: "", scorecardCriteria: defaultScorecardCriteria() };
}

function parseScorecardCriteria(raw: unknown): ScorecardCriterionDef[] | null {
  if (!Array.isArray(raw)) return null;
  const criteria: ScorecardCriterionDef[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<ScorecardCriterionDef>;
    if (typeof candidate.id !== "string" || candidate.id === "") continue;
    criteria.push({
      id: candidate.id,
      name: typeof candidate.name === "string" ? candidate.name : "",
      prompt: typeof candidate.prompt === "string" ? candidate.prompt : "",
    });
  }
  return criteria;
}

function parseSettings(text: string): SpaceSettings | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SpaceSettings>;
  return {
    businessDescription: typeof candidate.businessDescription === "string" ? candidate.businessDescription : "",
    scorecardCriteria: parseScorecardCriteria(candidate.scorecardCriteria) ?? defaultScorecardCriteria(),
  };
}

// Missing or corrupt settings.json is just the defaults, not a crash — same
// tolerance as every other per-Space storage module's parseMeta.
export async function readSettings(): Promise<SpaceSettings> {
  try {
    const text = await readTextFile(settingsPath(), { baseDir: BASE_DIR });
    return parseSettings(text) ?? defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export async function writeSettings(partial: Partial<SpaceSettings>): Promise<void> {
  const current = await readSettings();
  const next: SpaceSettings = { ...current, ...partial };
  await mkdir(spaceDir(getActiveSpaceFolder()), { baseDir: BASE_DIR, recursive: true });
  await writeTextFile(settingsPath(), JSON.stringify(next, null, 2), { baseDir: BASE_DIR });
}
