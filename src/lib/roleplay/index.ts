// Frontend wrapper for the Rust side (src-tauri/src/roleplay.rs) — the
// three real model calls behind Chat Roleplay's setup conversation,
// persona turns, and coach insight. Same thin-wrapper shape as
// src/lib/assistant's askAgent/nameChat wrappers.

import { invoke } from "@tauri-apps/api/core";

export type ProposalFields = { title: string; meta: string; assumptions: string[] };

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

export type RoleplayTurnReply = { thought: string | null; reply: string; sessionId: string };

// `message: null` asks the persona to open the scene unprompted — there is
// deliberately no second "thought" parameter anywhere on this call, so a
// trainee's private thought can never reach it (see roleplay.rs's own doc
// comment — this is enforced by the Rust signature, not a runtime check).
export async function generateRoleplayTurn(
  message: string | null,
  scenarioTitle: string,
  scenarioMeta: string,
  lockedAssumptions: string[],
  adjustmentPhrase: string | null,
  resumeSessionId: string | null,
): Promise<RoleplayTurnReply> {
  return invoke<RoleplayTurnReply>("generate_roleplay_turn", {
    message,
    scenarioTitle,
    scenarioMeta,
    lockedAssumptions,
    adjustmentPhrase,
    resumeSessionId,
  });
}

export type InsightKind = "adjustment" | "round_report" | "final_report";

export async function generateInsight(inputText: string, kind: InsightKind): Promise<string> {
  return invoke<string>("generate_insight", { inputText, kind });
}
