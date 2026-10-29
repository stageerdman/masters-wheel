import type { ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { HistoryListItem } from "./children/HistoryListItem/HistoryListItem";
import position from "./HistoryList.position.module.css";
import styles from "./HistoryList.styles.module.css";

type HistoryListProps = {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
};

// The Sidebar's "History" tab renders this as its sole content, so the
// section title lives on the tab itself — no label repeated in here.
export function HistoryList({ sessions, activeId, onSelect }: HistoryListProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
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
