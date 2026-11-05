import { isTauri } from "@tauri-apps/api/core";
import { listRecords, type RecordSummary } from "@/lib/records";
import { isWithinRange, passesSessionTypeFilter, type StatFilters } from "./filters";

export type Statistic = {
  id: string;
  label: string;
  // Dimensions this statistic pins unconditionally — see mergeFilters in
  // ./filters. E.g. Meetings always excludes practice/training calls,
  // regardless of what the global filter bar is set to.
  fixedFilters?: Partial<StatFilters>;
  compute: (filters: StatFilters) => Promise<string>;
};

// Outside the Tauri shell (e.g. the plain browser tab used for HMR
// preview) there's no fs bridge at all — same guard PerformanceReview
// uses, stay empty rather than throwing.
async function matchingRecords(
  filters: StatFilters,
  predicate: (record: RecordSummary) => boolean = () => true,
): Promise<RecordSummary[]> {
  const records = await listRecords();
  return records.filter(
    (record) =>
      predicate(record) &&
      isWithinRange(record.date, filters.dateRange) &&
      passesSessionTypeFilter(record.state, filters.sessionTypeFilter),
  );
}

async function countMeetings(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(filters);
  return String(records.length);
}

async function countClosed(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(filters, (record) => record.state === "closed");
  return String(records.length);
}

// Meetings where an offer was genuinely on the table — closed (won),
// failed (a real opportunity that didn't close), or postponed (still
// unresolved, but only once an actual amount was put on the table — a
// postponed call with no offeredAmount yet hasn't reached offer stage).
// Excludes training and notQualified, which per CALL_STATE_META were
// never real opportunities to begin with.
async function countOffers(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(
    filters,
    (record) =>
      record.state === "closed" ||
      record.state === "failed" ||
      (record.state === "postponed" && record.offeredAmount != null),
  );
  return String(records.length);
}

async function closedAmount(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(filters, (record) => record.state === "closed");
  const total = records.reduce((sum, record) => sum + (record.offeredAmount ?? 0), 0);
  return total.toLocaleString();
}

// How much money walked away — the sum of offeredAmount across every
// failed (lost) deal that actually had one written in; same reduce
// pattern as closedAmount above, just the other outcome.
async function lostAmount(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(filters, (record) => record.state === "failed");
  const total = records.reduce((sum, record) => sum + (record.offeredAmount ?? 0), 0);
  return total.toLocaleString();
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// Among genuinely real opportunities only (closed or failed) — excludes
// not-qualified leads, which per CALL_STATE_META were never real
// opportunities to begin with.
async function realCloseRate(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(filters, (record) => record.state === "closed" || record.state === "failed");
  const closed = records.filter((record) => record.state === "closed").length;
  return formatRate(closed, records.length);
}

// The broader rate — closed against everything that didn't close,
// including not-qualified leads in the denominator.
async function closeRate(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await matchingRecords(
    filters,
    (record) => record.state === "closed" || record.state === "failed" || record.state === "notQualified",
  );
  const closed = records.filter((record) => record.state === "closed").length;
  return formatRate(closed, records.length);
}

export const STATISTICS: Record<string, Statistic> = {
  meetings: {
    id: "meetings",
    label: "Meetings",
    fixedFilters: { sessionTypeFilter: { mode: "excludes", values: ["training"] } },
    compute: countMeetings,
  },
  offers: {
    id: "offers",
    label: "Offers",
    compute: countOffers,
  },
  closed: {
    id: "closed",
    label: "Closed",
    compute: countClosed,
  },
  "closed-amount": {
    id: "closed-amount",
    label: "Closed amount",
    compute: closedAmount,
  },
  "real-close-rate": {
    id: "real-close-rate",
    label: "Real close rate",
    compute: realCloseRate,
  },
  "close-rate": {
    id: "close-rate",
    label: "Close rate",
    compute: closeRate,
  },
  "lost-amount": {
    id: "lost-amount",
    label: "Lost amount",
    compute: lostAmount,
  },
};

export function getStatistic(id: string): Statistic {
  const statistic = STATISTICS[id];
  if (!statistic) {
    throw new Error(`Unknown statistic id: ${id}`);
  }
  return statistic;
}
