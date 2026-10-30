"use client";

import { useState } from "react";
import { parseIso, toIso } from "@/lib/statistics/filters";

export type CalendarView = "days" | "months" | "years";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// How many blank cells precede day 1, so the grid's columns stay aligned
// to Monday..Sunday.
export function leadingBlanks(year: number, month: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  return (weekday + 6) % 7;
}

function todayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function useCalendar(value: string | null) {
  const initial = value ? parseIso(value) : todayParts();
  const [view, setView] = useState<CalendarView>("days");
  const [displayYear, setDisplayYear] = useState(initial.year);
  const [displayMonth, setDisplayMonth] = useState(initial.month);

  function shiftMonth(delta: number) {
    let month = displayMonth + delta;
    let year = displayYear;
    if (month < 1) {
      month += 12;
      year -= 1;
    } else if (month > 12) {
      month -= 12;
      year += 1;
    }
    setDisplayMonth(month);
    setDisplayYear(year);
  }

  function shiftYear(delta: number) {
    setDisplayYear((year) => year + delta);
  }

  function openMonths() {
    setView("months");
  }

  function openYears() {
    setView("years");
  }

  function pickMonth(month: number) {
    setDisplayMonth(month);
    setView("days");
  }

  function pickYear(year: number) {
    setDisplayYear(year);
    setView("months");
  }

  function dayIso(day: number): string {
    return toIso(displayYear, displayMonth, day);
  }

  return {
    view,
    displayYear,
    displayMonth,
    shiftMonth,
    shiftYear,
    openMonths,
    openYears,
    pickMonth,
    pickYear,
    dayIso,
  };
}
