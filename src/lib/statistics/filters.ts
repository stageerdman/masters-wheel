// The filter shapes every statistic's compute() is evaluated against.
// Plain data, no UI — StatFilterBar produces these, src/lib/statistics
// consumes them. Dates are "YYYY-MM-DD" strings, parsed via Date.UTC
// rather than new Date(iso), to avoid local timezone shifting a day.

export type DateRange = {
  start: string | null;
  end: string | null;
};

export type SessionTypeFilterMode = "contains" | "excludes";

export type SessionTypeFilter = {
  mode: SessionTypeFilterMode;
  // Raw record.state strings (e.g. "training") — this layer doesn't know
  // about the CallState union, same boundary src/lib/records draws.
  values: string[];
};

export type StatFilters = {
  dateRange: DateRange;
  // null = filter not active (not added, or added but empty) — matches
  // everything either way.
  sessionTypeFilter: SessionTypeFilter | null;
};

export const ALL_TIME_FILTERS: StatFilters = {
  dateRange: { start: null, end: null },
  sessionTypeFilter: null,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function isWithinRange(iso: string, range: DateRange): boolean {
  if (range.start && iso < range.start) return false;
  if (range.end && iso > range.end) return false;
  return true;
}

export function passesSessionTypeFilter(state: string | null, filter: SessionTypeFilter | null): boolean {
  if (!filter || filter.values.length === 0) return true;
  const included = state !== null && filter.values.includes(state);
  return filter.mode === "contains" ? included : !included;
}
