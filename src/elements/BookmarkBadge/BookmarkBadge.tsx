import type { PointerEvent } from "react";
import position from "./BookmarkBadge.position.module.css";
import styles from "./BookmarkBadge.styles.module.css";

export type ContentKind = "main" | "transcript" | "notes" | "lessons";

export const BOOKMARK_META: Record<ContentKind, { label: string; color: string }> = {
  main: { label: "MA", color: "var(--color-bookmark-main)" },
  transcript: { label: "TR", color: "var(--color-bookmark-transcript)" },
  notes: { label: "NT", color: "var(--color-bookmark-notes)" },
  lessons: { label: "CL", color: "var(--color-bookmark-lessons)" },
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
