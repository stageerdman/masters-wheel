import { CALL_STATE_META, type CallState } from "@/elements/PerformanceReview/PerformanceReview.data";
import type { RecordSummary } from "@/lib/records";
import type { PerformanceReviewTag } from "@/lib/mcp/types";
import position from "./TagChip.position.module.css";
import styles from "./TagChip.styles.module.css";

type TagChipProps = {
  tag: PerformanceReviewTag;
  record: RecordSummary | undefined;
  onRemove: () => void;
};

// Same "unclassified" fallback VideoListItem uses for a record whose
// state is still null — never guesses a real state.
const UNSET_META = { glyph: "○", color: "var(--color-text-muted)" };

// RecordSummary stores state as a plain string (see
// src/lib/records/index.ts) — not yet narrowed to CallState the way
// PerformanceReview.script.ts's own isCallState does for the same reason.
function isCallState(value: string): value is CallState {
  return value in CALL_STATE_META;
}

export function TagChip({ tag, record, onRemove }: TagChipProps) {
  const meta = record?.state && isCallState(record.state) ? CALL_STATE_META[record.state] : UNSET_META;
  const isActive = tag.kind === "active";
  return (
    <span
      className={`${styles.root} ${position.root} ${isActive ? styles.active : styles.suggested}`}
      data-construction
      title={record?.description || undefined}
    >
      <span
        className={`${styles.icon} ${position.icon}`}
        data-construction
        style={{ "--icon-color": meta.color } as React.CSSProperties}
        aria-hidden="true"
      >
        {meta.glyph}
      </span>
      <span className={`${styles.title} ${position.title}`} data-construction>
        {record?.title ?? tag.recordId}
      </span>
      <button
        type="button"
        className={`${styles.removeButton} ${position.removeButton}`}
        data-construction
        onClick={onRemove}
        aria-label={`Remove ${record?.title ?? tag.recordId} tag`}
      >
        ×
      </button>
    </span>
  );
}
