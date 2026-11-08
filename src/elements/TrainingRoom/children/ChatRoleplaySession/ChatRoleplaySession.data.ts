// Types + persisted-state shape for the Chat Roleplay discipline. See
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec, and this update's
// Phases 16-19 (first real-backend pass) and 23-27 (persona/assumptions
// split, real-transcript grounding) for how this shape evolved.

export type Difficulty = "easy" | "medium" | "hard";

export type AssumptionRow = {
  id: string;
  text: string;
  checked: boolean;
};

// Shown to the trainee. `objective` is a reminder of what's being
// trained and why — never persona bio, since the persona is deliberately
// invisible (see Persona below). `meta` is a one-line *setting* fact
// (e.g. "Outbound, no prior contact") — also never a persona name.
// `assumptions` are facts about *this call* (trust already built, came
// from a Facebook ad, knows why they're on this call, coming in
// open/closed), not the person's personality.
export type ProposalCardData = {
  id: string;
  title: string;
  objective: string;
  difficulty: Difficulty;
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

// Who the persona is and how they communicate — never rendered anywhere
// in the UI. Grounded in a real past Performance Review call's transcript
// when one matching the difficulty is available (generate_persona picks
// a "closed" call for easy/medium, a "failed" one for hard), otherwise
// invented consistent with the objective/difficulty — see roleplay.rs.
// `responseLength`/`emotionalOpenness`/`languageStyle`/`limitingBeliefs`
// are exactly the axes `generate_roleplay_turn`'s meta-thought reasoning
// is instructed to reason *from*, not the persona's own voice.
export type Persona = {
  name: string;
  background: string;
  responseLength: "short" | "long" | "mixed";
  emotionalOpenness: "guarded" | "moderate" | "open";
  languageStyle: string;
  limitingBeliefs: string[];
  sourceRecordId: string | null;
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
  trainingObjective: string;
  difficulty: Difficulty | null;
  persona: Persona | null;
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
    trainingObjective: "",
    difficulty: null,
    persona: null,
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

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function parsePersona(raw: unknown): Persona | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<Persona>;
  if (typeof candidate.name !== "string") return null;
  return {
    name: candidate.name,
    background: typeof candidate.background === "string" ? candidate.background : "",
    responseLength:
      candidate.responseLength === "short" || candidate.responseLength === "long" || candidate.responseLength === "mixed"
        ? candidate.responseLength
        : "mixed",
    emotionalOpenness:
      candidate.emotionalOpenness === "guarded" || candidate.emotionalOpenness === "moderate" || candidate.emotionalOpenness === "open"
        ? candidate.emotionalOpenness
        : "moderate",
    languageStyle: typeof candidate.languageStyle === "string" ? candidate.languageStyle : "",
    limitingBeliefs: Array.isArray(candidate.limitingBeliefs) ? candidate.limitingBeliefs.filter((v): v is string => typeof v === "string") : [],
    sourceRecordId: typeof candidate.sourceRecordId === "string" ? candidate.sourceRecordId : null,
  };
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
    trainingObjective: typeof candidate.trainingObjective === "string" ? candidate.trainingObjective : "",
    difficulty: isDifficulty(candidate.difficulty) ? candidate.difficulty : null,
    persona: parsePersona(candidate.persona),
    lockedAssumptions: Array.isArray(candidate.lockedAssumptions) ? candidate.lockedAssumptions.filter(isLockedAssumption) : [],
    rounds: Array.isArray(candidate.rounds) ? candidate.rounds.filter(isSessionRound) : [],
    finalReport: typeof candidate.finalReport === "string" ? candidate.finalReport : null,
  };
}
