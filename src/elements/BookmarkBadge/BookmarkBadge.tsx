import type { PointerEvent } from "react";
import position from "./BookmarkBadge.position.module.css";
import styles from "./BookmarkBadge.styles.module.css";

export type ContentKind = "ai" | "transcript" | "notes" | "lessons" | "scorecard";

export const BOOKMARK_META: Record<ContentKind, { label: string; color: string }> = {
  ai: { label: "AI", color: "var(--color-bookmark-ai)" },
  transcript: { label: "TR", color: "var(--color-bookmark-transcript)" },
  notes: { label: "NT", color: "var(--color-bookmark-notes)" },
  lessons: { label: "CL", color: "var(--color-bookmark-lessons)" },
  scorecard: { label: "SC", color: "var(--color-bookmark-scorecard)" },
};

type BookmarkBadgeProps = {
  kind: ContentKind;
  active: boolean;
  onClick?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function BookmarkBadge({ kind, active, onClick, onPointerDown }: BookmarkBadgeProps) {
  const meta = BOOKMARK_META[kind];
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      style={{ "--badge-color": meta.color } as React.CSSProperties}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-pressed={active}
      aria-label={kind}
    >
      {meta.label}
    </button>
  );
}
