import { isTauri } from "@tauri-apps/api/core";
import { listRecords } from "@/lib/records";
import { isWithinRange, passesSessionTypeFilter, type StatFilters } from "./filters";

export type Statistic = {
  id: string;
  label: string;
  compute: (filters: StatFilters) => Promise<string>;
};

// Practice/training calls are never real meetings — excluded unconditionally,
// not something the session-type filter needs to be set up to hide.
const PRACTICE_STATE = "training";

// Outside the Tauri shell (e.g. the plain browser tab used for HMR
// preview) there's no fs bridge at all — same guard PerformanceReview
// uses, stay empty rather than throwing.
async function countMeetings(filters: StatFilters): Promise<string> {
  if (!isTauri()) return "—";
  const records = await listRecords();
  const count = records.filter(
    (record) =>
      record.state !== PRACTICE_STATE &&
      isWithinRange(record.date, filters.dateRange) &&
      passesSessionTypeFilter(record.state, filters.sessionTypeFilter),
  ).length;
  return String(count);
}

export const STATISTICS: Record<string, Statistic> = {
  meetings: {
    id: "meetings",
    label: "Meetings",
    compute: countMeetings,
  },
};

export function getStatistic(id: string): Statistic {
  const statistic = STATISTICS[id];
  if (!statistic) {
    throw new Error(`Unknown statistic id: ${id}`);
  }
  return statistic;
}
