// Bare "1d" / "30d" / "2mo" / "1y" recency tokens for compact list rows
// (Training Room's SessionListItem) — distinct from formatRelativeTime's
// "3h ago" style used elsewhere, which doesn't fit a narrow list row and
// doesn't bucket past days into months/years. Months use "mo" rather than
// "m" so they're never visually identical to the minutes bucket.
export function formatShortRelativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.round(months / 12);
  return `${years}y`;
}
