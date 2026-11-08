// Frontend wrapper for the Rust side (src-tauri/src/roleplay.rs) — the
// real model calls behind Chat Roleplay's setup conversation, persona
// building, persona turns, session adjustment, and coach insight. Same
// thin-wrapper shape as src/lib/assistant's askAgent/nameChat wrappers.

import { invoke } from "@tauri-apps/api/core";
import type { Difficulty, Persona } from "@/elements/TrainingRoom/children/ChatRoleplaySession/ChatRoleplaySession.data";

export type ProposalFields = { title: string; objective: string; difficulty: Difficulty; meta: string; assumptions: string[] };

export type SetupReply = {
  kind: "question" | "proposal";
  message: string | null;
  proposal: ProposalFields | null;
  sessionId: string;
};

export async function generateSetupReply(
  message: string,
  resumeSessionId: string | null,
  businessDescription: string,
): Promise<SetupReply> {
  return invoke<SetupReply>("generate_setup_reply", { message, resumeSessionId, businessDescription });
}

// Picks a real past Performance Review call to ground the persona in
// (a "failed" call for difficulty "hard", a "closed" one otherwise) and
// extracts their communication patterns from its real transcript — see
// roleplay.rs's own doc comment. Falls back to inventing a persona
// consistent with the objective/difficulty when no matching record with
// a transcript exists.
export async function generatePersona(
  activeSpaceFolder: string,
  objective: string,
  difficulty: Difficulty,
): Promise<Persona> {
  return invoke<Persona>("generate_persona", { activeSpaceFolder, objective, difficulty });
}

export type RoleplayTurnReply = { thought: string | null; reply: string; sessionId: string };

// `message: null` asks the persona to open the scene unprompted — there is
// deliberately no second "thought" parameter anywhere on this call, so a
// trainee's private thought can never reach it (see roleplay.rs's own doc
// comment — this is enforced by the Rust signature, not a runtime check).
// `persona` + `callAssumptions` are passed as structured data, not a
// pre-built prompt string — the system prompt is built on the Rust side.
export async function generateRoleplayTurn(
  message: string | null,
  persona: Persona,
  callAssumptions: string[],
  adjustmentPhrase: string | null,
  resumeSessionId: string | null,
): Promise<RoleplayTurnReply> {
  return invoke<RoleplayTurnReply>("generate_roleplay_turn", {
    message,
    persona,
    callAssumptions,
    adjustmentPhrase,
    resumeSessionId,
  });
}

export type SessionAdjustment = { phrase: string; persona: Persona };

// What "Next Session" calls: decides both the trainee-facing adjustment
// phrase and whether the persona itself should shift (difficulty,
// characteristics, conversation direction) to target what the trainee
// needs to practice next — most fields usually come back unchanged.
export async function generateSessionAdjustment(
  transcriptText: string,
  objective: string,
  persona: Persona,
): Promise<SessionAdjustment> {
  return invoke<SessionAdjustment>("generate_session_adjustment", { transcriptText, objective, persona });
}

export type InsightKind = "round_report" | "final_report";

export async function generateInsight(inputText: string, kind: InsightKind): Promise<string> {
  return invoke<string>("generate_insight", { inputText, kind });
}
