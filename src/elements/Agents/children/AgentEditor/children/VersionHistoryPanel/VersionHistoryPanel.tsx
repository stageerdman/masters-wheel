"use client";

import type { AgentVersion } from "@/elements/Agents/Agents.data";
import { VersionRow } from "./children/VersionRow/VersionRow";
import position from "./VersionHistoryPanel.position.module.css";
import styles from "./VersionHistoryPanel.styles.module.css";

type VersionHistoryPanelProps = {
  isOpen: boolean;
  versions: AgentVersion[];
  onRestore: (version: AgentVersion) => void;
};

// Reuses the AI Assistant's Sidebar push-split mechanic (a real flex-
// width split, not a modal) — see this update's wiki.md for why a modal
// would hide the very content a restore decision depends on comparing
// against.
export function VersionHistoryPanel({ isOpen, versions, onRestore }: VersionHistoryPanelProps) {
  const ordered = [...versions].reverse();
  const currentId = versions[versions.length - 1]?.id;

  return (
    <div className={`${styles.root} ${position.root} ${isOpen ? position.open : ""}`} data-construction>
      <div className={position.inner} data-construction>
        <div className={position.header} data-construction>
          <span className={styles.headerTitle} data-construction>
            Version History
          </span>
        </div>
        {ordered.length === 0 ? (
          <div className={`${styles.empty} ${position.empty}`} data-construction>
            No saved versions yet — your first Save will appear here.
          </div>
        ) : (
          <div className={position.list} data-construction>
            {ordered.map((version) => (
              <VersionRow key={version.id} version={version} isCurrent={version.id === currentId} onRestore={() => onRestore(version)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
