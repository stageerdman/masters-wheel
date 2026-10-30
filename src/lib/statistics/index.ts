export type Statistic = {
  id: string;
  label: string;
  compute: () => string;
};

// Fake/static for now — no backend to query yet. Each entry is a reusable
// option any StatGrid slot can reference by id.
export const STATISTICS: Record<string, Statistic> = {
  "sessions-this-month": {
    id: "sessions-this-month",
    label: "Sessions this month",
    compute: () => "42",
  },
  "win-rate": {
    id: "win-rate",
    label: "Win rate",
    compute: () => "61%",
  },
  "avg-deal-size": {
    id: "avg-deal-size",
    label: "Avg. deal size",
    compute: () => "$18,400",
  },
  "active-trainees": {
    id: "active-trainees",
    label: "Active trainees",
    compute: () => "9",
  },
};

export function getStatistic(id: string): Statistic {
  const statistic = STATISTICS[id];
  if (!statistic) {
    throw new Error(`Unknown statistic id: ${id}`);
  }
  return statistic;
}
