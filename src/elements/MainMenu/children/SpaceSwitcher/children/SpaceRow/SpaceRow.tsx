import type { MouseEvent } from "react";
import { SpaceIcon } from "@/elements/SpaceIcon/SpaceIcon";
import type { Space } from "@/lib/spaces";
import position from "./SpaceRow.position.module.css";
import styles from "./SpaceRow.styles.module.css";

type SpaceRowProps = {
  space: Space;
  active: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
};

// One row in the switcher's dropdown — icon + name, highlighted if it's
// the current Space. Right-click opens the delete context menu (see
// SpaceSwitcher.tsx); only nested here, not reused anywhere else.
export function SpaceRow({ space, active, onClick, onContextMenu }: SpaceRowProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={`${styles.root} ${position.root} ${active ? styles.active : ""}`}
      data-construction
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <SpaceIcon icon={space.icon} size={18} />
      <span className={`${styles.label} ${position.label}`} data-construction>
        {space.name}
      </span>
    </button>
  );
}
