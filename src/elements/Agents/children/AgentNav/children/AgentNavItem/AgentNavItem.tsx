import type { MouseEvent } from "react";
import type { CoachAgent } from "@/elements/Agents/Agents.data";
import position from "./AgentNavItem.position.module.css";
import styles from "./AgentNavItem.styles.module.css";

type AgentNavItemProps = {
  // null renders the "Add new agent" row — same shape as a normal row,
  // just a `+` where the photo/initial would be, per the dictated spec.
  agent: CoachAgent | null;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (event: MouseEvent) => void;
};

export function AgentNavItem({ agent, active, onClick, onContextMenu }: AgentNavItemProps) {
  const isAdd = agent === null;
  const trimmedName = isAdd ? "" : agent.name.trim();
  const name = isAdd ? "Add new agent" : trimmedName.length > 0 ? agent.name : "Untitled agent";
  const initial = !isAdd && trimmedName.length > 0 ? trimmedName[0].toUpperCase() : null;

  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      onClick={onClick}
      onContextMenu={isAdd ? undefined : onContextMenu}
      aria-pressed={isAdd ? undefined : active}
      title={!isAdd && agent.description ? agent.description : undefined}
    >
      <span
        className={`${styles.avatar} ${position.avatar} ${isAdd ? styles.avatarAdd : ""} ${
          !isAdd && !agent.photoUrl && !initial ? styles.avatarPlaceholder : ""
        }`}
        data-construction
        aria-hidden="true"
      >
        {isAdd ? (
          "+"
        ) : agent.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.photoUrl}
            alt=""
            className={`${styles.avatarImage} ${position.avatarImage}`}
            data-construction
          />
        ) : (
          initial ?? "+"
        )}
      </span>
      <span className={position.textRows} data-construction>
        <span className={`${styles.name} ${isAdd || trimmedName.length === 0 ? styles.nameMuted : ""}`} data-construction>
          {name}
        </span>
        <span className={styles.descriptor} data-construction>
          {isAdd ? "" : agent.description}
        </span>
      </span>
    </button>
  );
}
