import { isTauri } from "@tauri-apps/api/core";
import { listRecords } from "@/lib/records";

export type Statistic = {
  id: string;
  label: string;
  compute: () => Promise<string>;
};

// record.date is "YYYY-MM-DD", stamped at upload time — i.e. the session's
// date. Compared as plain numbers, not via `new Date(iso)`, to avoid UTC
// parsing shifting the day in negative-offset timezones.
function isSameMonth(iso: string, reference: Date): boolean {
  const [year, month] = iso.split("-").map(Number);
  return year === reference.getFullYear() && month === reference.getMonth() + 1;
}

// Outside the Tauri shell (e.g. the plain browser tab used for HMR
// preview) there's no fs bridge at all — same guard PerformanceReview
// uses, stay empty rather than throwing.
async function sessionsThisMonth(): Promise<string> {
  if (!isTauri()) return "—";
  const records = await listRecords();
  const now = new Date();
  const count = records.filter((record) => isSameMonth(record.date, now)).length;
  return String(count);
}

export const STATISTICS: Record<string, Statistic> = {
  "sessions-this-month": {
    id: "sessions-this-month",
    label: "Sessions this month",
    compute: sessionsThisMonth,
  },
};

export function getStatistic(id: string): Statistic {
  const statistic = STATISTICS[id];
  if (!statistic) {
    throw new Error(`Unknown statistic id: ${id}`);
  }
  return statistic;
}
