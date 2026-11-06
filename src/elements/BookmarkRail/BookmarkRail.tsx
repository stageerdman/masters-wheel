import { BookmarkBadge, type BookmarkMeta } from "@/elements/BookmarkBadge/BookmarkBadge";
import position from "./BookmarkRail.position.module.css";
import styles from "./BookmarkRail.styles.module.css";

type BookmarkRailProps<K extends string> = {
  kinds: readonly K[];
  metaFor: (kind: K) => BookmarkMeta;
  active: K;
  onSelect: (kind: K) => void;
};

// Click-only vertical stack of BookmarkBadges, generic over whatever kind
// set the caller passes in — Hero's single-pane use case. Detail's
// draggable/splittable version is the separate SplitRail element.
export function BookmarkRail<K extends string>({ kinds, metaFor, active, onSelect }: BookmarkRailProps<K>) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {kinds.map((kind) => (
        <BookmarkBadge
          key={kind}
          kind={kind}
          meta={metaFor(kind)}
          active={kind === active}
          onClick={() => onSelect(kind)}
        />
      ))}
    </div>
  );
}
