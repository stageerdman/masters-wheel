"use client";

import { useEffect, useRef } from "react";
import { toIso } from "@/lib/statistics/filters";
import { daysInMonth, leadingBlanks, MONTH_NAMES, useCalendar, WEEKDAY_LABELS } from "./Calendar.script";
import position from "./Calendar.position.module.css";
import styles from "./Calendar.styles.module.css";

type CalendarProps = {
  label: string;
  value: string | null;
  onSelect: (iso: string) => void;
};

const YEAR_RANGE = { before: 100, after: 1 };

function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function Calendar({ label, value, onSelect }: CalendarProps) {
  const { view, displayYear, displayMonth, shiftMonth, shiftYear, openMonths, openYears, pickMonth, pickYear, dayIso } =
    useCalendar(value);
  const activeYearRef = useRef<HTMLButtonElement>(null);
  const today = todayIso();

  useEffect(() => {
    if (view === "years") {
      activeYearRef.current?.scrollIntoView({ block: "center" });
    }
  }, [view]);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={styles.label} data-construction>
        {label}
      </span>

      {view === "days" && (
        <>
          <div className={position.header} data-construction>
            <button type="button" className={styles.navButton} data-construction onClick={() => shiftMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <button type="button" className={styles.headerLabel} data-construction onClick={openMonths}>
              {MONTH_NAMES[displayMonth - 1]}
            </button>
            <button type="button" className={styles.headerLabel} data-construction onClick={openYears}>
              {displayYear}
            </button>
            <button type="button" className={styles.navButton} data-construction onClick={() => shiftMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>
          <div className={position.weekdayRow} data-construction>
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className={styles.weekday} data-construction>
                {weekday}
              </span>
            ))}
          </div>
          <div className={position.dayGrid} data-construction>
            {Array.from({ length: leadingBlanks(displayYear, displayMonth) }).map((_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: daysInMonth(displayYear, displayMonth) }).map((_, index) => {
              const day = index + 1;
              const iso = dayIso(day);
              const isSelected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`${styles.day} ${isSelected ? styles.daySelected : ""} ${isToday ? styles.dayToday : ""}`}
                  data-construction
                  onClick={() => onSelect(iso)}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </>
      )}

      {view === "months" && (
        <>
          <div className={position.header} data-construction>
            <button type="button" className={styles.navButton} data-construction onClick={() => shiftYear(-1)} aria-label="Previous year">
              ‹
            </button>
            <button type="button" className={styles.headerLabel} data-construction onClick={openYears}>
              {displayYear}
            </button>
            <button type="button" className={styles.navButton} data-construction onClick={() => shiftYear(1)} aria-label="Next year">
              ›
            </button>
          </div>
          <div className={position.monthGrid} data-construction>
            {MONTH_NAMES.map((month, index) => (
              <button
                key={month}
                type="button"
                className={`${styles.gridOption} ${index + 1 === displayMonth ? styles.gridOptionSelected : ""}`}
                data-construction
                onClick={() => pickMonth(index + 1)}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </>
      )}

      {view === "years" && (
        <div className={position.yearList} data-construction>
          {Array.from({ length: YEAR_RANGE.before + YEAR_RANGE.after + 1 }).map((_, index) => {
            const year = displayYear + YEAR_RANGE.after - index;
            const isSelected = year === displayYear;
            return (
              <button
                key={year}
                ref={isSelected ? activeYearRef : undefined}
                type="button"
                className={`${styles.gridOption} ${isSelected ? styles.gridOptionSelected : ""}`}
                data-construction
                onClick={() => pickYear(year)}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
