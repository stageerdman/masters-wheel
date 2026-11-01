import type { AgentVersion } from "@/elements/Agents/Agents.data";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import position from "./VersionRow.position.module.css";
import styles from "./VersionRow.styles.module.css";

type VersionRowProps = {
  version: AgentVersion;
  isCurrent: boolean;
  onRestore: () => void;
};

export function VersionRow({ version, isCurrent, onRestore }: VersionRowProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.textRows} data-construction>
        <span className={`${styles.versionNumber} ${position.versionNumber}`} data-construction>
          v{version.versionNumber}
          {isCurrent && (
            <span className={`${styles.currentBadge} ${position.currentBadge}`} data-construction>
              Current
            </span>
          )}
        </span>
        <span className={`${styles.timestamp} ${position.timestamp}`} data-construction title={new Date(version.createdAt).toLocaleString()}>
          {formatRelativeTime(version.createdAt)}
        </span>
        <span className={`${styles.changeLabel} ${position.changeLabel}`} data-construction>
          {version.changeLabel}
        </span>
      </div>
      {!isCurrent && (
        <button type="button" className={`${styles.restoreButton} ${position.restoreButton}`} data-construction onClick={onRestore}>
          Restore
        </button>
      )}
    </div>
  );
}
