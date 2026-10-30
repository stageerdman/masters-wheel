// Pure logic for turning two field snapshots into a version entry —
// no disk access (see storage.ts for that). Split out so the "what changed,
// in words" question can be understood and tested on its own.

import type { AgentFields, AgentVersion } from "./types";

const FIELD_LABELS: Record<keyof AgentFields, string> = {
  name: "Name",
  nickname: "Nickname",
  nicknameLocked: "Nickname",
  description: "Description",
  instructions: "Instructions",
  photoUrl: "Photo",
  knowledgeFiles: "Knowledge",
};

function describeChange(previous: AgentFields | null, next: AgentFields): string {
  if (!previous) return "Created";
  const changed = new Set<string>();
  for (const key of Object.keys(next) as (keyof AgentFields)[]) {
    if (key === "nicknameLocked") continue;
    const isEqual =
      key === "knowledgeFiles" ? JSON.stringify(previous[key]) === JSON.stringify(next[key]) : previous[key] === next[key];
    if (!isEqual) changed.add(FIELD_LABELS[key]);
  }
  if (changed.size === 0) return "No changes";
  return `${Array.from(changed).join(", ")} changed`;
}

export function makeVersion(previous: AgentVersion[], fields: AgentFields): AgentVersion {
  const previousFields = previous[previous.length - 1]?.fields ?? null;
  return {
    id: crypto.randomUUID(),
    versionNumber: previous.length + 1,
    createdAt: new Date().toISOString(),
    changeLabel: describeChange(previousFields, fields),
    fields,
  };
}
