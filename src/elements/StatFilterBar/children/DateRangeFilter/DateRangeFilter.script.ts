"use client";

// Date math + the open/close/positioning state machine for the date-range
// filter chip. Dates are plain "YYYY-MM-DD" strings throughout (same
// format as a record's own `date` field) rather than Date objects, parsed
// via Date.UTC — same reasoning as src/lib/statistics: avoids local
// timezone shifting a day when round-tripping.

import { useCallback, useEffect, useRef, useState } from "react";

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

export type DateRange = {
  start: string | null;
  end: string | null;
};

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

export function useDateRangeFilter() {
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [activePreset, setActivePreset] = useState<PresetId | null>("all-time");
  const [range, setRange] = useState<DateRange>(computePresetRange("all-time"));

  const close = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback(() => {
    setOpen((current) => {
      if (!current) setAnchorRect(chipRef.current?.getBoundingClientRect() ?? null);
      return !current;
    });
  }, []);

  const selectPreset = useCallback((presetId: PresetId) => {
    setActivePreset(presetId);
    setRange(computePresetRange(presetId));
    setOpen(false);
  }, []);

  const selectDate = useCallback((which: "start" | "end", iso: string) => {
    setActivePreset(null);
    setRange((current) => ({ ...current, [which]: iso }));
  }, []);

  // A popover anchored to a scrolled-away chip reads as broken rather
  // than "attached" to it — closing when the page behind it scrolls is
  // simpler and more honest than trying to keep repositioning it live.
  // Scrolling *inside* the popup itself (the preset list, a calendar's
  // year list) must not trigger this — those are marked with
  // data-date-range-popup so this handler can tell the difference.
  useEffect(() => {
    if (!open) return;
    function handleScroll(event: Event) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-date-range-popup]")) return;
      setOpen(false);
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return {
    chipRef,
    open,
    anchorRect,
    label: formatRangeLabel(activePreset, range),
    activePreset,
    range,
    close,
    toggleOpen,
    selectPreset,
    selectDate,
  };
}
