import type { RecordSummary } from "@/lib/records";
import type { SessionSummary as TrainingSessionSummary } from "@/lib/training";
import type { ChatTag, TaggedResourceKind } from "@/lib/mcp/types";
import { TagChip } from "./children/TagChip/TagChip";
import position from "./TagBar.position.module.css";
import styles from "./TagBar.styles.module.css";

type TagBarProps = {
  tags: ChatTag[];
  records: RecordSummary[];
  trainingSessions: TrainingSessionSummary[];
  onRemove: (resourceKind: TaggedResourceKind, resourceId: string) => void;
};

// Sits between the window header and the chat itself — see this update's
// wiki.md (updates/2026-11-01 MCP-TOOLS - OPEN) for why tags exist and
// what they do. Renders nothing at all when there are no tags, rather
// than reserving empty space for a bar nobody needs yet. Generalized to
// resolve either a Performance Review record or a Training Room session
// by id, once the latter became a second real taggable resource kind.
export function TagBar({ tags, records, trainingSessions, onRemove }: TagBarProps) {
  if (tags.length === 0) return null;
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {tags.map((tag) => (
        <TagChip
          key={`${tag.resourceKind}:${tag.resourceId}`}
          tag={tag}
          record={tag.resourceKind === "performanceReview" ? records.find((record) => record.id === tag.resourceId) : undefined}
          trainingSession={
            tag.resourceKind === "trainingSession" ? trainingSessions.find((session) => session.id === tag.resourceId) : undefined
          }
          onRemove={() => onRemove(tag.resourceKind, tag.resourceId)}
        />
      ))}
    </div>
  );
}
