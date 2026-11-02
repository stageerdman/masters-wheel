import type { RecordSummary } from "@/lib/records";
import type { PerformanceReviewTag } from "@/lib/mcp/types";
import { TagChip } from "./children/TagChip/TagChip";
import position from "./TagBar.position.module.css";
import styles from "./TagBar.styles.module.css";

type TagBarProps = {
  tags: PerformanceReviewTag[];
  records: RecordSummary[];
  onRemove: (recordId: string) => void;
};

// Sits between the window header and the chat itself — see this update's
// wiki.md (updates/2026-11-01 MCP-TOOLS - OPEN) for why tags exist and
// what they do. Renders nothing at all when there are no tags, rather
// than reserving empty space for a bar nobody needs yet.
export function TagBar({ tags, records, onRemove }: TagBarProps) {
  if (tags.length === 0) return null;
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {tags.map((tag) => (
        <TagChip
          key={tag.recordId}
          tag={tag}
          record={records.find((record) => record.id === tag.recordId)}
          onRemove={() => onRemove(tag.recordId)}
        />
      ))}
    </div>
  );
}
