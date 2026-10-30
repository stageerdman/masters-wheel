import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { isDraftSession } from "@/elements/AIAssistant/AIAssistant.script";
import { HistoryListItem } from "./children/HistoryListItem/HistoryListItem";
import position from "./HistoryList.position.module.css";
import styles from "./HistoryList.styles.module.css";

type HistoryListProps = {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  agents: Agent[];
};

// The Sidebar's "History" tab renders this as its sole content, so the
// section title lives on the tab itself — no label repeated in here. A
// draft session (see AIAssistant.script.ts's isDraftSession) is just the
// current "pick someone" prompt, not a real past conversation, so it's
// filtered out here rather than showing as a fake "Now" entry.
export function HistoryList({ sessions, activeId, onSelect, agents }: HistoryListProps) {
  const realSessions = sessions.filter((session) => !isDraftSession(session));

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {realSessions.map((session) => (
        <HistoryListItem
          key={session.id}
          session={session}
          active={session.id === activeId}
          onSelect={() => onSelect(session.id)}
          agents={agents}
        />
      ))}
    </div>
  );
}
