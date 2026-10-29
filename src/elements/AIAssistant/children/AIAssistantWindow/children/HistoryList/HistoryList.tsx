import type { ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { HistoryListItem } from "./children/HistoryListItem/HistoryListItem";
import position from "./HistoryList.position.module.css";
import styles from "./HistoryList.styles.module.css";

type HistoryListProps = {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function HistoryList({ sessions, activeId, onSelect }: HistoryListProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <span className={`${styles.label} ${position.label}`} data-construction>
        History
      </span>
      {sessions.map((session) => (
        <HistoryListItem
          key={session.id}
          session={session}
          active={session.id === activeId}
          onSelect={() => onSelect(session.id)}
        />
      ))}
    </div>
  );
}
