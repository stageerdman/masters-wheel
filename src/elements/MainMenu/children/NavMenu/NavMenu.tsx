"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { NavMenuItem } from "./children/NavMenuItem/NavMenuItem";
import position from "./NavMenu.position.module.css";
import styles from "./NavMenu.styles.module.css";

export type NavMenuEntry = {
  id: string;
  label: string;
};

type NavMenuProps = {
  items: NavMenuEntry[];
  onActivate: (id: string) => void;
};

export function NavMenu({ items, onActivate }: NavMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onActivate(items[highlightedIndex].id);
    }
  }

  return (
    <ul
      ref={listRef}
      className={`${styles.root} ${position.root}`}
      data-construction
      role="listbox"
      aria-label="Main menu"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <NavMenuItem
          key={item.id}
          label={item.label}
          highlighted={index === highlightedIndex}
          onHover={() => setHighlightedIndex(index)}
          onActivate={() => {
            setHighlightedIndex(index);
            onActivate(item.id);
          }}
        />
      ))}
    </ul>
  );
}
