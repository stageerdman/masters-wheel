import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentStrip } from "./children/AgentStrip/AgentStrip";
import { HistoryList } from "./children/HistoryList/HistoryList";
import position from "./Sidebar.position.module.css";
import styles from "./Sidebar.styles.module.css";

type SidebarProps = {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  agents: Agent[];
  agentsByRecency: Agent[];
  onSelectAgent: (id: string) => void;
};

// Agents used to live behind their own tab, alongside History — now
// they're a quick-access strip up top (most-recently-used first,
// clicking one jumps straight into a chat with them) with History below
// it as the panel's one remaining section, so the tab switcher itself is
// gone.
export function Sidebar({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  agents,
  agentsByRecency,
  onSelectAgent,
}: SidebarProps) {
  return (
    <div className={`${styles.root} ${position.root} ${isOpen ? position.open : ""}`} data-construction>
      <div className={position.inner} data-construction>
        <AgentStrip agents={agentsByRecency} onSelectAgent={onSelectAgent} />
        <p className={`${styles.sectionLabel} ${position.sectionLabel}`} data-construction>
          History
        </p>
        <HistoryList
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={onSelectSession}
          onDelete={onDeleteSession}
          onRename={onRenameSession}
          agents={agents}
        />
      </div>
    </div>
  );
}
