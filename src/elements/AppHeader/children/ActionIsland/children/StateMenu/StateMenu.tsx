"use client";

import { useEffect, useRef, useState } from "react";
import type { HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import position from "./StateMenu.position.module.css";
import styles from "./StateMenu.styles.module.css";

type StateMenuProps = {
  options: HeaderIslandOption[];
  activeId: string | null;
  onChange: (id: string) => void;
};

// Neutral core-palette glyph shown when nothing has been classified yet
// (a freshly created record starts with state: null) — never falls back
// to the first real option, which would dishonestly imply a state.
const UNSET: HeaderIslandOption = { id: "", glyph: "○", color: "var(--color-text-muted)", label: "Unclassified" };

export function StateMenu({ options, activeId, onChange }: StateMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = (activeId !== null ? options.find((option) => option.id === activeId) : null) ?? UNSET;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.glyphButton} ${position.glyphButton}`}
        data-construction
        style={{ "--icon-color": active.color } as React.CSSProperties}
        onClick={() => setOpen((value) => !value)}
        title={active.label}
        aria-label={`Call state: ${active.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {active.glyph}
      </button>
      {open && (
        <ul className={`${styles.menu} ${position.menu}`} data-construction role="menu">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={`${styles.glyphButton} ${position.glyphButton} ${
                  option.id === activeId ? styles.activeOption : ""
                }`}
                data-construction
                style={{ "--icon-color": option.color } as React.CSSProperties}
                role="menuitemradio"
                aria-checked={option.id === activeId}
                title={option.label}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                {option.glyph}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
