// The one Agent shape in this app — shared by the Agents builder
// (create/edit/knowledge files) and the AIAssistant chat roster
// (@mention/drag into a conversation). They used to be two separate
// fixture types with no backend; now that both are backed by the same
// real, persisted agent, there is exactly one type to agree on. See
// updates/2026-10-30 AGENTS-ENGINE - OPEN/wiki.md, open decision #4.

export type KnowledgeFile = {
  id: string;
  name: string;
  size: number;
  /** File extension (e.g. "pdf", "txt", "md") — not a MIME type. */
  type: string;
  /** How many retrievable chunks the knowledge pipeline split this file into. */
  chunkCount: number;
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

export type Agent = { id: string } & AgentFields;

export type AgentVersion = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeLabel: string;
  fields: AgentFields;
};
