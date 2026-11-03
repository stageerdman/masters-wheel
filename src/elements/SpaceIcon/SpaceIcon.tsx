import { resolveSpaceIcon } from "./icons";
import position from "./SpaceIcon.position.module.css";
import styles from "./SpaceIcon.styles.module.css";

type SpaceIconProps = {
  icon: string;
  /** Pixel size — a caller-chosen size, this element never guesses its own. */
  size: number;
};

// Reusable, shared by every place a Space's icon shows up — the switcher
// trigger, each dropdown row, and the icon-picker grid in
// CreateSpaceModal. Every Space renders the same uniform white, no
// per-category color: the glyph itself (which icon) is what identifies a
// Space, not a hue — so unlike BookmarkBadge/AgentAvatar this needs no
// per-instance color custom property, just `currentColor` inherited from
// wherever it's placed.
export function SpaceIcon({ icon, size }: SpaceIconProps) {
  const Icon = resolveSpaceIcon(icon);
  return (
    <span className={`${styles.root} ${position.root}`} data-construction>
      {/* Looks like "a component created during render" to the linter,
          but resolveSpaceIcon only ever picks among the fixed,
          module-level components in icons.ts's ICON_COMPONENTS map —
          same stable reference every render for a given id, never
          actually constructed here. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon size={size} weight="duotone" color="currentColor" />
    </span>
  );
}
