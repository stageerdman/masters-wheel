import type { ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import position from "./HistoryListItem.position.module.css";
import styles from "./HistoryListItem.styles.module.css";

type HistoryListItemProps = {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
};

export function HistoryListItem({ session, active, onSelect }: HistoryListItemProps) {
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className={styles.title} data-construction>
        {session.title}
      </span>
      <span className={styles.date} data-construction>
        {session.relativeDate}
      </span>
    </button>
  );
}
