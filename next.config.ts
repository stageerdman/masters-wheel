import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  // We use CLAUDE.md (AI Control), not AGENTS.md — stop Next.js from regenerating it.
  agentRules: false,
  // The bottom-left dev indicator badge is replaced by our own AIAssistant trigger.
  devIndicators: false,
};

export default nextConfig;
