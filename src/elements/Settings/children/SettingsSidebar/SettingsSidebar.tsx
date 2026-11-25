"use client";

import { UserCircle, ChartBar, Cloud } from "@phosphor-icons/react";
import position from "./SettingsSidebar.position.module.css";
import styles from "./SettingsSidebar.styles.module.css";

export type SettingsCategory = "profile" | "score" | "storage";

type SettingsSidebarProps = {
  active: SettingsCategory;
  onSelect: (category: SettingsCategory) => void;
};

const CATEGORIES: { id: SettingsCategory; label: string; icon: typeof UserCircle }[] = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "score", label: "Score", icon: ChartBar },
  { id: "storage", label: "Storage", icon: Cloud },
];

// Left icon rail, single-select — same role="radiogroup"/aria-checked
// pattern CreateSpaceModal's icon grid already uses, duotone Phosphor
// icons same as SpaceIcon.
export function SettingsSidebar({ active, onSelect }: SettingsSidebarProps) {
  return (
    <div className={`${styles.root} ${position.root}`} data-construction role="radiogroup" aria-label="Settings category">
      {CATEGORIES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active === id}
          title={label}
          aria-label={label}
          className={`${styles.option} ${position.option} ${active === id ? styles.optionSelected : ""}`}
          data-construction
          onClick={() => onSelect(id)}
        >
          <Icon size={22} weight="duotone" color="currentColor" />
        </button>
      ))}
    </div>
  );
}
