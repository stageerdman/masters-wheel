// Public entry point for this module — every other part of the app
// imports agent types/behavior from here, never from the individual files
// directly. Each file behind this barrel owns exactly one concern:
//   types.ts         - what an Agent/KnowledgeFile/AgentVersion looks like
//   storage.ts        - reading/writing an agent's folder on disk
//   versionDiff.ts     - turning two field snapshots into a version entry
//   knowledgeFiles.ts  - picking + indexing/removing knowledge files
//   photo.ts           - picking + persisting an agent's photo
//   initial.ts         - an agent's single-letter avatar glyph
//   description.ts     - an agent's description, with a default fallback

export * from "./types";
export { ensureAgentsRoot, listAgents, saveAgent, deleteAgent, listVersions, appendVersion } from "./storage";
export { makeVersion } from "./versionDiff";
export {
  basenameOf,
  isKnowledgeFilePath,
  pickKnowledgeFiles,
  ingestKnowledgeFile,
  onKnowledgeIngestProgress,
  removeKnowledgeFile,
} from "./knowledgeFiles";
export { isImagePath, pickAgentPhoto, readImageAsDataUrl } from "./photo";
export type { KnowledgeIngestProgress } from "./knowledgeFiles";
export { agentInitial } from "./initial";
export { agentDescription } from "./description";
