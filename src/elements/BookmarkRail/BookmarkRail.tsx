import { BookmarkBadge, type ContentKind } from "@/elements/BookmarkBadge/BookmarkBadge";
import position from "./BookmarkRail.position.module.css";
import styles from "./BookmarkRail.styles.module.css";

const ORDER: ContentKind[] = ["ai", "transcript", "notes", "lessons", "scorecard"];

type BookmarkRailProps = {
  active: ContentKind;
  onSelect: (kind: ContentKind) => void;
};

export function BookmarkRail({ active, onSelect }: BookmarkRailProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {ORDER.map((kind) => (
        <BookmarkBadge
          key={kind}
          kind={kind}
          active={kind === active}
          onClick={() => onSelect(kind)}
        />
      ))}
    </div>
  );
}
