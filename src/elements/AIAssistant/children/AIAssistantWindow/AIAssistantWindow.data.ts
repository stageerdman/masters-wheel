import type { ChatSession, Agent } from "@/elements/AIAssistant/AIAssistant.script";

// Static fake fixtures — UI-shell only, no backend. Canned history (not a
// live simulated reply) is the same kind of honest fakery the rest of the
// app already uses (e.g. PerformanceReview's fake transcript lines).
export const AGENTS: Agent[] = [
  {
    id: "researcher",
    name: "Researcher",
    tagline: "Digs through sources and summarizes.",
    initial: "R",
    instructions:
      "You are Researcher, a focused research assistant inside the Master's Wheel app. Dig into whatever the user is asking about and summarize clearly and concisely — prefer a short list of concrete findings over a long narrative.",
  },
  {
    id: "coach",
    name: "Coach",
    tagline: "Pushes on technique and mindset.",
    initial: "C",
    instructions:
      "You are Coach, a direct performance coach inside the Master's Wheel app. Push on technique and mindset rather than just agreeing — ask one sharpening question before offering advice, and keep replies short and actionable.",
  },
  {
    id: "scheduler",
    name: "Scheduler",
    tagline: "Keeps sessions and deadlines straight.",
    initial: "S",
    instructions:
      "You are Scheduler, a terse scheduling assistant inside the Master's Wheel app. Help the user keep sessions and deadlines straight. Keep replies very short — this is a utility, not a conversationalist.",
  },
];

export const HISTORY_FIXTURES: ChatSession[] = [
  {
    id: "hist-1",
    title: "Reviewing last week's call",
    relativeDate: "2d ago",
    activeAgentIds: [],
    messages: [
      { id: "hist-1-m1", role: "user", text: "What should I focus on from the last call?" },
      { id: "hist-1-m2", role: "assistant", text: "Pacing through the objection handling section." },
    ],
  },
  {
    id: "hist-2",
    title: "Core lesson phrasing",
    relativeDate: "5d ago",
    activeAgentIds: [],
    messages: [{ id: "hist-2-m1", role: "user", text: "Help me tighten this core lesson." }],
  },
  {
    id: "hist-3",
    title: "Training ground follow-up",
    relativeDate: "1w ago",
    activeAgentIds: [],
    messages: [],
  },
];
