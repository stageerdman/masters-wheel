// Real agents now (see src/lib/agents) — no fixtures. Re-exported from
// here so every file under this element keeps importing "its own" data
// module, same convention as every other element, while the actual type
// and persistence logic lives in one shared place (also used by
// AIAssistant's chat roster — see that update's wiki.md, open decision #4).
export type { Agent as CoachAgent, AgentFields, AgentVersion, KnowledgeFile } from "@/lib/agents";
