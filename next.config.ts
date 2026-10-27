import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // We use CLAUDE.md (AI Control), not AGENTS.md — stop Next.js from regenerating it.
  agentRules: false,
};

export default nextConfig;
