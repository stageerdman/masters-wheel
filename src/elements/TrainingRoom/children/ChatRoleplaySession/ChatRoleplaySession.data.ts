// Types + persisted-state shape for the Chat Roleplay discipline. See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec, and this update's
// Phases 16-19 for the real-backend wiring that replaced every scripted
// constant that used to live in this file.

export type AssumptionRow = {
  id: string;
  text: string;
  checked: boolean;
};

export type ProposalCardData = {
  id: string;
  title: string;
  meta: string;
  assumptions: AssumptionRow[];
  frozen: boolean;
  superseded: boolean;
};

export type SetupBlock =
  | { id: string; kind: "text"; role: "ai" | "user"; text: string }
  | { id: string; kind: "card"; card: ProposalCardData }
  | { id: string; kind: "divider"; label: string };

export type ThoughtAuthor = "ai" | "user";

export type Thought = {
  author: ThoughtAuthor;
  text: string;
};

export type RoleplayTurn = {
  id: string;
  speaker: "persona" | "user";
  text: string;
  thought?: Thought;
};

// One roleplay attempt. Only the latest round in `rounds` is ever live/
// interactive — every earlier one is permanently read-only the moment
// "Next Session" creates the next one. `report` is this round's own AI
// summary, generated the moment it stops being live; `adjustmentPhrase`
// is the single carried-forward note it *started* with (null for round 1,
// which has nothing to carry forward yet). `claudeSessionId` is this
// round's own `--resume` id for `generate_roleplay_turn` — null until the
// round's opening turn comes back, and deliberately never carried into
// the *next* round (a round reset means a fresh CLI session too; only
// the plain-text adjustment phrase crosses that boundary, not raw
// session memory).
export type SessionRound = {
  id: string;
  roundNumber: number;
  turns: RoleplayTurn[];
  adjustmentPhrase: string | null;
  report: string | null;
  claudeSessionId: string | null;
};

export type AssumptionAmendment = { text: string; at: number };

export type LockedAssumption = {
  id: string;
  text: string;
  history: AssumptionAmendment[];
};

// Everything about one Chat Roleplay session that survives a reload —
// persisted opaquely by src/lib/training as session.json's `roleplay`
// field (that module doesn't know this shape, same as it doesn't know
// TrainingToolType — see its own file header).
export type RoleplayState = {
  phase: "setup" | "live";
  setupThread: SetupBlock[];
  setupSessionId: string | null;
  scenarioTitle: string;
  scenarioMeta: string;
  lockedAssumptions: LockedAssumption[];
  rounds: SessionRound[];
  finalReport: string | null;
};

export const SETUP_OPENING_MESSAGE =
  "What would you like to train today? Describe who you're talking to and what you're trying to practice.";

export function emptyRoleplayState(): RoleplayState {
  return {
    phase: "setup",
    setupThread: [{ id: "opening", kind: "text", role: "ai", text: SETUP_OPENING_MESSAGE }],
    setupSessionId: null,
    scenarioTitle: "",
    scenarioMeta: "",
    lockedAssumptions: [],
    rounds: [],
    finalReport: null,
  };
}

function isSetupBlock(value: unknown): value is SetupBlock {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SetupBlock>;
  return (
    typeof candidate.id === "string" &&
    (candidate.kind === "text" || candidate.kind === "card" || candidate.kind === "divider")
  );
}

function isSessionRound(value: unknown): value is SessionRound {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SessionRound>;
  return typeof candidate.id === "string" && Array.isArray(candidate.turns);
}

function isLockedAssumption(value: unknown): value is LockedAssumption {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LockedAssumption>;
  return typeof candidate.id === "string" && typeof candidate.text === "string";
}

// Tolerant parse of the opaque blob src/lib/training hands back — missing
// or corrupt is just "no roleplay state yet" (a fresh session), never a
// crash, same ethos as every other storage module's parseMeta.
export function parseRoleplayState(raw: unknown): RoleplayState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<RoleplayState>;
  if (candidate.phase !== "setup" && candidate.phase !== "live") return null;
  return {
    phase: candidate.phase,
    setupThread: Array.isArray(candidate.setupThread) ? candidate.setupThread.filter(isSetupBlock) : [],
    setupSessionId: typeof candidate.setupSessionId === "string" ? candidate.setupSessionId : null,
    scenarioTitle: typeof candidate.scenarioTitle === "string" ? candidate.scenarioTitle : "",
    scenarioMeta: typeof candidate.scenarioMeta === "string" ? candidate.scenarioMeta : "",
    lockedAssumptions: Array.isArray(candidate.lockedAssumptions) ? candidate.lockedAssumptions.filter(isLockedAssumption) : [],
    rounds: Array.isArray(candidate.rounds) ? candidate.rounds.filter(isSessionRound) : [],
    finalReport: typeof candidate.finalReport === "string" ? candidate.finalReport : null,
  };
}
