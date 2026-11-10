import { CALL_STATE_META, type CallState } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { SearchResultMatch, SearchResultsPayload } from "@/lib/mcp/types";
import position from "./SearchResults.position.module.css";
import styles from "./SearchResults.styles.module.css";

type SearchResultsProps = {
  results: SearchResultsPayload;
};

// Neutral core-palette glyph for a record with no classified state yet —
// same fallback VideoListItem uses, never guesses a real state.
const UNSET_META = { glyph: "○", color: "var(--color-text-muted)" };

function MatchRow({ match }: { match: SearchResultMatch }) {
  const meta = match.status ? CALL_STATE_META[match.status as CallState] : UNSET_META;
  const body = match.snippet ?? match.description;
  return (
    <div className={`${styles.match} ${position.match}`} data-construction>
      <span
        className={`${styles.icon} ${position.icon}`}
        data-construction
        style={{ "--icon-color": meta.color } as React.CSSProperties}
        aria-hidden="true"
      >
        {meta.glyph}
      </span>
      <div className={position.matchBody} data-construction>
        <div className={`${styles.matchHeader} ${position.matchHeader}`} data-construction>
          <span className={`${styles.date} ${position.date}`} data-construction>
            {match.date}
          </span>
          <span className={`${styles.title} ${position.title}`} data-construction>
            {match.title}
          </span>
        </div>
        {body ? (
          <p className={`${styles.snippet} ${position.snippet}`} data-construction>
            {body}
          </p>
        ) : null}
        {match.content_access_required ? (
          <p className={`${styles.note} ${position.note}`} data-construction>
            Matched inside this call&rsquo;s real content — not shown yet, needs your permission to open.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Renders in place of an ordinary Message bubble (see MessageList.tsx)
// whenever message.searchResults is set — a snapshot of one
// search_performance_reviews call's own result. Unlike PermissionRequest
// there's nothing to respond to here, so this never changes once shown.
export function SearchResults({ results }: SearchResultsProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <p className={`${styles.heading} ${position.heading}`} data-construction>
        {results.matches.length === 0
          ? `No calls matched "${results.query}".`
          : `${results.matches.length} call${results.matches.length === 1 ? "" : "s"} matched "${results.query}":`}
      </p>
      {results.matches.map((match) => (
        <MatchRow key={match.record_id} match={match} />
      ))}
    </div>
  );
}
