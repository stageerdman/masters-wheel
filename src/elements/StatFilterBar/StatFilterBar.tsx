// The filter row sitting above the Grid, inside the Space (it scrolls
// away with the grid, it isn't a sticky header — see StatSpace). The row
// itself is invisible; only the filter chips inside it have any visual
// presence, same shell-vs-content split as StatWidget. Date range is the
// first filter — more will join as siblings here once dictated.

import { DateRangeFilter } from "./children/DateRangeFilter/DateRangeFilter";
import position from "./StatFilterBar.position.module.css";
import styles from "./StatFilterBar.styles.module.css";

export function StatFilterBar() {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <DateRangeFilter />
    </div>
  );
}
