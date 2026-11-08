// Scripted content for the Chat Roleplay prototype — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`'s "Chat Roleplay
// discipline" section for the full dictated spec this implements. Every
// value here is canned/fake; nothing calls a real model. One running
// example throughout (a cold-call opener against "Marcus Webb," a
// skeptical, impatient enterprise IT Director), same example used in the
// Artifact prototype this was built from.

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

export type AssumptionAmendment = { text: string; at: number };

export type LockedAssumption = {
  id: string;
  text: string;
  history: AssumptionAmendment[];
};

export const SETUP_OPENING_MESSAGE =
  "Got it — a cold call scenario. A few quick things:\n" +
  "1. Who's the prospect? (role, seniority, mood)\n" +
  "2. How experienced should they be at pushing back?\n" +
  "3. Anything you want to skip past — like assume rapport's already there?";

export function freshProposalCard(id: string): ProposalCardData {
  return {
    id,
    title: "Cold Call — Skeptical IT Director, Hard",
    meta: "Persona: Marcus Webb, IT Director · Difficulty: Hard · Setting: Outbound, no prior contact.",
    assumptions: [
      { id: `${id}-a1`, text: "You're already past the gatekeeper — this skips the switchboard.", checked: true },
      { id: `${id}-a2`, text: "No prior outreach has happened — this is first contact.", checked: true },
      {
        id: `${id}-a3`,
        text: "Marcus has been burned by vendors before — start skeptical, not neutral.",
        checked: true,
      },
    ],
    frozen: false,
    superseded: false,
  };
}

export const REFINED_META =
  "Persona: Marcus Webb, IT Director · Difficulty: Hard · Setting: Outbound, impatient — 5 minutes available.";

export const HERO_SUMMARY =
  "Practicing a cold-call opener against Marcus Webb, a skeptical enterprise IT Director with only " +
  "five minutes between meetings, who has already said no to vendors like us before. Goal: earn real " +
  "attention fast and secure a next step, without pitching features early.";

export const HERO_NAME = "Marcus Webb — Skeptical IT Director";

export const PERSONA_OPENING: Thought & { text: string } = {
  author: "ai",
  text: "Testing whether the rep sounds rehearsed — giving a short, impatient window to see if they waste it.",
};

export const PERSONA_OPENING_LINE =
  "*(phone picks up, clipped)* Webb. I've got five minutes — who is this and why are you calling my direct line?";

export const PERSONA_REPLY_POOL: { text: string; thought: string }[] = [
  {
    text: "*(pause)* ...Half? Which companies. I've heard that pitch before and it didn't hold up.",
    thought:
      "Testing whether the rep has real specifics behind the stat or just an opener — pushing back hard per the already-said-no assumption.",
  },
  {
    text: "*(checks watch)* You've got two minutes left. Convince me this isn't another vendor fishing expedition.",
    thought: "Raising the stakes on the clock to see if the rep rushes into a pitch or stays composed.",
  },
  {
    text: "Fine — say the companies. If you can't, we're done.",
    thought: "Forcing specificity; if the rep can't back the claim, trust drops further.",
  },
];

// "Next Session" carries forward one short adjustment phrase per round —
// mocked here (a cycling canned pool) until something real distills it
// from the transcript that just finished. See the wiki's "Next Session"
// section for what's expected to persist vs. reset once this is real.
export const ADJUSTMENT_PHRASE_POOL: string[] = [
  "Try opening with a direct question instead of a stat this time.",
  "Let his pushback sit a beat longer before responding.",
  "Lead with a proof point he can verify, not another claim.",
];
