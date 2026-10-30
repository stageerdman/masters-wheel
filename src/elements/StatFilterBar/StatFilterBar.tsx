"use client";

// The filter row sitting above the Grid, inside the Space (it scrolls
// away with the grid, it isn't a sticky header — see StatSpace). The row
// itself is invisible; only the filter chips inside it have any visual
// presence, same shell-vs-content split as StatWidget.
//
// Order: date-range chip, then any custom filters the user has added,
// then the "+" add-filter button at the end.

import type { StatFilters } from "@/lib/statistics/filters";
import { DateRangeFilter } from "./children/DateRangeFilter/DateRangeFilter";
import { SessionTypeFilter } from "./children/SessionTypeFilter/SessionTypeFilter";
import { AddFilterButton } from "./children/AddFilterButton/AddFilterButton";
import { useStatFilterBar } from "./StatFilterBar.script";
import position from "./StatFilterBar.position.module.css";
import styles from "./StatFilterBar.styles.module.css";

type StatFilterBarProps = {
  onFiltersChange: (filters: StatFilters) => void;
};

export function StatFilterBar({ onFiltersChange }: StatFilterBarProps) {
  const {
    activePreset,
    range,
    selectPreset,
    selectDate,
    activeFilters,
    availableFilterTypes,
    addFilter,
    removeFilter,
    updateFilter,
  } = useStatFilterBar(onFiltersChange);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <DateRangeFilter
        activePreset={activePreset}
        range={range}
        onSelectPreset={selectPreset}
        onSelectDate={selectDate}
      />
      {activeFilters.map((filter) => (
        <SessionTypeFilter
          key={filter.id}
          value={filter.value}
          onChange={(value) => updateFilter(filter.id, value)}
          onRemove={() => removeFilter(filter.id)}
        />
      ))}
      <AddFilterButton availableFilterTypes={availableFilterTypes} onAddFilter={addFilter} />
    </div>
  );
}
