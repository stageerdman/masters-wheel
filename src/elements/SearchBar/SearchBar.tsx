import position from "./SearchBar.position.module.css";
import styles from "./SearchBar.styles.module.css";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <input
      className={`${styles.root} ${position.root}`}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? "Search"}
      aria-label={placeholder ?? "Search"}
    />
  );
}
