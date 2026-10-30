// Preset definitions + date math for the date-range chip. The actual
// DateRange/toIso/parseIso shapes live in src/lib/statistics/filters —
// this file only owns what's specific to the chip's own UI: which
// presets exist and how to label the current selection.

import { parseIso, toIso, type DateRange } from "@/lib/statistics/filters";

export type PresetId =
  | "all-time"
  | "today"
  | "yesterday"
  | "this-week"
  | "last-7-days"
  | "this-month"
  | "last-30-days"
  | "last-90-days"
  | "this-year";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all-time", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this-week", label: "This week" },
  { id: "last-7-days", label: "Last 7 days" },
  { id: "this-month", label: "This month" },
  { id: "last-30-days", label: "Last 30 days" },
  { id: "last-90-days", label: "Last 90 days" },
  { id: "this-year", label: "This year" },
];

function todayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function shiftDays(year: number, month: number, day: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function startOfWeek(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (date.getUTCDay() + 6) % 7; // Monday = start of week
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function computePresetRange(presetId: PresetId): DateRange {
  const t = todayParts();
  const todayIso = toIso(t.year, t.month, t.day);
  switch (presetId) {
    case "all-time":
      return { start: null, end: null };
    case "today":
      return { start: todayIso, end: todayIso };
    case "yesterday": {
      const y = shiftDays(t.year, t.month, t.day, -1);
      const iso = toIso(y.year, y.month, y.day);
      return { start: iso, end: iso };
    }
    case "this-week": {
      const s = startOfWeek(t.year, t.month, t.day);
      return { start: toIso(s.year, s.month, s.day), end: todayIso };
    }
    case "last-7-days": {
      const s = shiftDays(t.year, t.month, t.day, -6);
      return { start: toIso(s.year, s.month, s.day), end: todayIso };
    }
    case "this-month":
      return { start: toIso(t.year, t.month, 1), end: todayIso };
    case "last-30-days": {
      const s = shiftDays(t.year, t.month, t.day, -29);
      return { start: toIso(s.year, s.month, s.day), end: todayIso };
    }
    case "last-90-days": {
      const s = shiftDays(t.year, t.month, t.day, -89);
      return { start: toIso(s.year, s.month, s.day), end: todayIso };
    }
    case "this-year":
      return { start: toIso(t.year, 1, 1), end: todayIso };
  }
}

export function formatDateLabel(iso: string): string {
  const { year, month, day } = parseIso(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatRangeLabel(activePreset: PresetId | null, range: DateRange): string {
  if (activePreset) {
    return PRESETS.find((preset) => preset.id === activePreset)?.label ?? "All time";
  }
  if (!range.start && !range.end) return "All time";
  if (range.start && range.end) return `${formatDateLabel(range.start)} – ${formatDateLabel(range.end)}`;
  if (range.start) return `From ${formatDateLabel(range.start)}`;
  return `Until ${formatDateLabel(range.end as string)}`;
}
