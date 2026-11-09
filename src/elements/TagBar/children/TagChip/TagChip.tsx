import { CALL_STATE_META, type CallState } from "@/elements/PerformanceReview/PerformanceReview.data";
import { TOOL_TYPE_META, type TrainingToolType } from "@/elements/TrainingRoom/TrainingRoom.data";
import type { RecordSummary } from "@/lib/records";
import type { SessionSummary as TrainingSessionSummary } from "@/lib/training";
import type { ChatTag } from "@/lib/mcp/types";
import position from "./TagChip.position.module.css";
import styles from "./TagChip.styles.module.css";

type TagChipProps = {
  tag: ChatTag;
  record: RecordSummary | undefined;
  trainingSession: TrainingSessionSummary | undefined;
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

function isTrainingToolType(value: string): value is TrainingToolType {
  return value in TOOL_TYPE_META;
}

// Generalized once Training Room sessions became a second taggable
// resource kind — a Performance Review tag's glyph/color comes from the
// record's call-state (same as VideoListItem); a Training Room tag's
// comes from its discipline (same as SessionListItem) — the two kinds
// have no shared "status" concept, so each resolves its own meta.
export function TagChip({ tag, record, trainingSession, onRemove }: TagChipProps) {
  const meta =
    tag.resourceKind === "performanceReview"
      ? record?.state && isCallState(record.state)
        ? CALL_STATE_META[record.state]
        : UNSET_META
      : trainingSession && isTrainingToolType(trainingSession.toolType)
        ? TOOL_TYPE_META[trainingSession.toolType]
        : UNSET_META;
  const title = tag.resourceKind === "performanceReview" ? record?.title : trainingSession?.name;
  const isActive = tag.state === "active";

  return (
    <span
      className={`${styles.root} ${position.root} ${isActive ? styles.active : styles.suggested}`}
      data-construction
      title={tag.resourceKind === "performanceReview" ? record?.description || undefined : undefined}
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
        {title ?? tag.resourceId}
      </span>
      <button
        type="button"
        className={`${styles.removeButton} ${position.removeButton}`}
        data-construction
        onClick={onRemove}
        aria-label={`Remove ${title ?? tag.resourceId} tag`}
      >
        ×
      </button>
    </span>
  );
}
