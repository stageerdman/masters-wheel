// Fake fixture data — no backend yet. Delete this file once real data
// arrives rather than growing it. See FEATURES.md.
//
// Deliberately NOT the same `Agent` type AIAssistant.script.ts uses for
// the chat roster/@mentions — confirmed unnecessary for this feature, see
// this update's wiki.md.

export type KnowledgeFile = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type AgentFields = {
  name: string;
  nickname: string;
  nicknameLocked: boolean;
  description: string;
  instructions: string;
  photoUrl: string | null;
  knowledgeFiles: KnowledgeFile[];
};

export type CoachAgent = { id: string } & AgentFields;

export type AgentVersion = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeLabel: string;
  fields: AgentFields;
};

// A fixed fake "context window" budget knowledge files are measured
// against — there's no real model/backend here, so this stands in for one.
export const FAKE_CONTEXT_CAP_BYTES = 2_000_000;

export const FAKE_AGENTS: CoachAgent[] = [
  {
    id: "sales-coach",
    name: "Sales Coach",
    nickname: "salescoach",
    nicknameLocked: false,
    description: "Reviews call transcripts and pushes on objection handling.",
    instructions:
      "You coach sales reps after every call. Lean on @Objection Playbook.pdf for language, and always ask for a concrete follow-up date before closing out a review.",
    photoUrl: null,
    knowledgeFiles: [
      { id: "kf-1", name: "Objection Playbook.pdf", size: 420_000, type: "application/pdf" },
      { id: "kf-2", name: "Pricing Sheet.xlsx", size: 85_000, type: "application/vnd.ms-excel" },
    ],
  },
  {
    id: "onboarding-guide",
    name: "Onboarding Guide",
    nickname: "onboardingguide",
    nicknameLocked: false,
    description: "Answers new-hire questions from the training library.",
    instructions: "Answer only from the uploaded knowledge files. If it's not in there, say so.",
    photoUrl: null,
    knowledgeFiles: [],
  },
];
