import position from "./NavMenuItem.position.module.css";
import styles from "./NavMenuItem.styles.module.css";

type NavMenuItemProps = {
  label: string;
  highlighted: boolean;
  onHover: () => void;
  onActivate: () => void;
};

export function NavMenuItem({ label, highlighted, onHover, onActivate }: NavMenuItemProps) {
  return (
    <li
      className={`${styles.root} ${position.root} ${highlighted ? styles.highlighted : ""}`}
      data-construction
      role="option"
      aria-selected={highlighted}
      onMouseEnter={onHover}
      onClick={onActivate}
    >
      <span className={`${styles.marker} ${position.marker}`} data-construction aria-hidden="true">
        {highlighted ? "→" : ""}
      </span>
      <span className={position.label} data-construction>
        {label}
      </span>
    </li>
  );
}
