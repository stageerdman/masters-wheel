import type { ComponentType, PointerEvent } from "react";
import position from "./BookmarkBadge.position.module.css";
import styles from "./BookmarkBadge.styles.module.css";

// A color + up to a 2-letter label, nothing more — see
// `updates/2026-10-28 PERFORMANCE-REVIEW - OPEN/wiki.md` for why bookmarks
// are deliberately this minimal. What the available kinds *are* and what
// each one's label/color is stays with whichever page uses this (see e.g.
// PerformanceReview.data.ts's CONTENT_KIND_META) — this element only knows
// how to render one badge given its meta, not the full kind set.
// `icon`, when given, replaces the letters on the badge (the letters then
// only serve as its accessible name/tooltip, via `name` if set).
export type BookmarkMeta = { label: string; color: string; name?: string; icon?: ComponentType };

type BookmarkBadgeProps = {
  kind: string;
  meta: BookmarkMeta;
  active: boolean;
  onClick?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function BookmarkBadge({ kind, meta, active, onClick, onPointerDown }: BookmarkBadgeProps) {
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      style={{ "--badge-color": meta.color } as React.CSSProperties}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-pressed={active}
      aria-label={meta.name ?? kind}
      title={meta.name}
    >
      {meta.icon ? <meta.icon /> : meta.label}
    </button>
  );
}
