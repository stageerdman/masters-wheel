// Compact token-count label — "400k", "1.2M" — for anywhere a raw token
// number would otherwise be an unreadable 6-7 digit integer.
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1000)}k`;
  return String(Math.round(tokens));
}
