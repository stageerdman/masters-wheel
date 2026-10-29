"use client";

import { useEffect, useRef, useState } from "react";
import type { HeaderIslandOption } from "@/elements/AppHeader/AppHeader.context";
import position from "./StateMenu.position.module.css";
import styles from "./StateMenu.styles.module.css";

type StateMenuProps = {
  options: HeaderIslandOption[];
  activeId: string;
  onChange: (id: string) => void;
};

export function StateMenu({ options, activeId, onChange }: StateMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((option) => option.id === activeId) ?? options[0];

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
