"use client";

// Owns the filter bar's actual state: the date range, and the list of
// custom filters the user has added via the "+" menu (just session-type
// today, more filter types can join this list later — see wiki.md).
// Persisted to localStorage so the user doesn't have to set it up again
// every time, and derives the merged StatFilters that StatGrid's
// statistics are computed against.

import { useCallback, useEffect, useState } from "react";
import type { SessionTypeFilter, StatFilters } from "@/lib/statistics/filters";
import { computePresetRange, type PresetId } from "./children/DateRangeFilter/DateRangeFilter.script";

export type FilterTypeId = "session-type";

export type ActiveFilter = {
  id: string;
  type: FilterTypeId;
  value: SessionTypeFilter;
};

export const FILTER_TYPES: { id: FilterTypeId; label: string }[] = [{ id: "session-type", label: "Session type" }];

type PersistedState = {
  activePreset: PresetId | null;
  range: { start: string | null; end: string | null };
  activeFilters: ActiveFilter[];
};

const STORAGE_KEY = "analytics-stat-filters";

const DEFAULT_STATE: PersistedState = {
  activePreset: "all-time",
  range: computePresetRange("all-time"),
  activeFilters: [],
};

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return { ...DEFAULT_STATE, ...parsed };
  } catch {
    // Storage unavailable or malformed — fall back to the built-in default.
  }
  return DEFAULT_STATE;
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled (e.g. private browsing) — just won't persist.
  }
}

export function useStatFilterBar(onFiltersChange: (filters: StatFilters) => void) {
  const [activePreset, setActivePreset] = useState<PresetId | null>(DEFAULT_STATE.activePreset);
  const [range, setRange] = useState(DEFAULT_STATE.range);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(DEFAULT_STATE.activeFilters);

  // localStorage isn't available during SSR, so this can't be a lazy
  // useState initializer — a one-time hydration from a non-reactive
  // external store, not the cascading-update pattern this rule otherwise
  // guards against (same reasoning as AIAssistant's preset-overrides load).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadPersisted();
    setActivePreset(saved.activePreset);
    setRange(saved.range);
    setActiveFilters(saved.activeFilters);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    savePersisted({ activePreset, range, activeFilters });
    const sessionTypeFilter = activeFilters.find((filter) => filter.type === "session-type")?.value ?? null;
    onFiltersChange({ dateRange: range, sessionTypeFilter });
    // onFiltersChange identity isn't expected to change — only the
    // filter values themselves should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset, range, activeFilters]);

  const selectPreset = useCallback((presetId: PresetId) => {
    setActivePreset(presetId);
    setRange(computePresetRange(presetId));
  }, []);

  const selectDate = useCallback((which: "start" | "end", iso: string) => {
    setActivePreset(null);
    setRange((current) => ({ ...current, [which]: iso }));
  }, []);

  const availableFilterTypes = FILTER_TYPES.filter(
    (type) => !activeFilters.some((filter) => filter.type === type.id),
  );

  const addFilter = useCallback((type: FilterTypeId) => {
    setActiveFilters((current) => [...current, { id: `${type}-${Date.now()}`, type, value: { mode: "contains", values: [] } }]);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setActiveFilters((current) => current.filter((filter) => filter.id !== id));
  }, []);

  const updateFilter = useCallback((id: string, value: SessionTypeFilter) => {
    setActiveFilters((current) => current.map((filter) => (filter.id === id ? { ...filter, value } : filter)));
  }, []);

  return {
    activePreset,
    range,
    selectPreset,
    selectDate,
    activeFilters,
    availableFilterTypes,
    addFilter,
    removeFilter,
    updateFilter,
  };
}
