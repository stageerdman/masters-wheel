"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrainingToolType } from "../../TrainingRoom.data";

// How long the "ignite" flash (DisciplineFrame's .confirming state) plays
// before the real selection actually fires.
const CONFIRM_DELAY_MS = 460;

// DisciplinePicker is only ever mounted by its parent while open (see
// TrainingRoom.tsx) — there's no isOpen prop to react to here, so
// confirmingToolType's initial `null` is already correct on every fresh
// mount, and this effect only has to run once per mount rather than reset
// state on an isOpen transition.
export function useDisciplinePicker(onClose: () => void, onSelect: (toolType: TrainingToolType) => void) {
  const [confirmingToolType, setConfirmingToolType] = useState<TrainingToolType | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    rootRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Cancelling (Esc / blank-space click) mid-ignite must not leave a
      // stray timer that fires onSelect after this component is gone —
      // that would silently create a session the user just backed out of.
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, [onClose]);

  const choose = useCallback(
    (toolType: TrainingToolType) => {
      setConfirmingToolType(toolType);
      confirmTimer.current = setTimeout(() => onSelect(toolType), CONFIRM_DELAY_MS);
    },
    [onSelect]
  );

  return { confirmingToolType, choose, rootRef };
}
