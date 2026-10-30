"use client";

import { useState } from "react";
import type { Agent, ChatSession } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentRoster } from "../AgentRoster/AgentRoster";
import { HistoryList } from "../HistoryList/HistoryList";
import position from "./Sidebar.position.module.css";
import styles from "./Sidebar.styles.module.css";

type SidebarTab = "history" | "agents";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "history", label: "History" },
  { id: "agents", label: "Agents" },
];

type SidebarProps = {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  agents: Agent[];
  onSelectAgent: (id: string) => void;
};

// History and Agents share this one panel, one tab active at a time —
// showing both stacked at once ate too much vertical space in the
// narrow dock to scroll comfortably. More sections can join TABS later.
export function Sidebar({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  agents,
  onSelectAgent,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("history");

  return (
    <div className={`${styles.root} ${position.root} ${isOpen ? position.open : ""}`} data-construction>
      <div className={position.inner} data-construction>
        <div className={`${styles.tabs} ${position.tabs}`} data-construction>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${position.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              data-construction
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "history" ? (
          <HistoryList sessions={sessions} activeId={activeSessionId} onSelect={onSelectSession} agents={agents} />
        ) : (
          <AgentRoster agents={agents} onSelect={onSelectAgent} />
        )}
      </div>
    </div>
  );
}
