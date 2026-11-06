import position from "./AddSessionListItem.position.module.css";
import styles from "./AddSessionListItem.styles.module.css";

type AddSessionListItemProps = {
  onAdd: () => void;
};

// Pinned above the Open/Closed groups, not trailing the list like
// Performance Review's AddRecordListItem — "add a new training practice"
// is the first thing in this column. No file picker here: a session
// starts empty, clips get added once it's open in Hero.
export function AddSessionListItem({ onAdd }: AddSessionListItemProps) {
  return (
    <button type="button" className={`${styles.root} ${position.root}`} data-construction onClick={onAdd}>
      <span className={`${styles.icon} ${position.icon}`} data-construction aria-hidden="true">
        +
      </span>
      <span className={position.textRows} data-construction>
        <span className={styles.title} data-construction>
          Add training practice
        </span>
      </span>
    </button>
  );
}
