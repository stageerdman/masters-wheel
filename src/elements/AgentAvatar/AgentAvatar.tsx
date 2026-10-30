import type { CSSProperties } from "react";
import type { Agent } from "@/lib/agents";
import { agentInitial } from "@/lib/agents";
import position from "./AgentAvatar.position.module.css";
import styles from "./AgentAvatar.styles.module.css";

type AgentAvatarProps = {
  agent: Pick<Agent, "name" | "photoUrl">;
  /** Pixel diameter — a caller-chosen size, this element never guesses its own. */
  size: number;
};

// Reusable, shared by every place an agent shows up in the chat
// (AgentRosterItem, ActiveAgentChip, AgentPicker, HistoryListItem) —
// previously each one duplicated its own initial-letter badge and never
// rendered the real uploaded photo. Size is parent-owned (see CLAUDE.md's
// "position is a property of the relationship to the parent"), passed
// through as a local CSS custom property, same pattern as
// BookmarkBadge's --badge-color.
export function AgentAvatar({ agent, size }: AgentAvatarProps) {
  const style = { "--avatar-size": `${size}px` } as CSSProperties;

  return (
    <span className={`${styles.root} ${position.root}`} style={style} data-construction>
      {agent.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={agent.photoUrl} alt="" className={`${styles.image} ${position.image}`} data-construction />
      ) : (
        agentInitial(agent.name)
      )}
    </span>
  );
}
