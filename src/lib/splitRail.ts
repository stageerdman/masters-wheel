"use client";

// State machine behind the SplitRail element: where the drag-to-split line
// sits, which kinds are pinned above/below it, and persistence — generic
// over whatever kind set + storage key a page passes in, so each page
// (Performance Review's Detail, Training Room's Detail, ...) keeps its own
// independently-persisted layout. Originally Performance-Review-specific
// (Detail.script.ts); promoted here once Training Room became a second
// real consumer — see
// `updates/2026-11-06 TRAINING-ROOM - OPEN/wiki.md`.

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type DragInfo = {
  startY: number;
  startLinePx: number;
  railHeight: number;
};

type PersistedSplit<K extends string> = {
  linePx: number | null;
  bottomKind: K | null;
  activeTop: K;
};

function loadSplitState<K extends string>(storageKey: string, kinds: readonly K[]): PersistedSplit<K> | null {
  const isKind = (value: unknown): value is K => typeof value === "string" && (kinds as readonly string[]).includes(value);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      linePx: typeof parsed.linePx === "number" ? parsed.linePx : null,
      bottomKind: isKind(parsed.bottomKind) ? parsed.bottomKind : null,
      activeTop: isKind(parsed.activeTop) ? parsed.activeTop : kinds[0],
    };
  } catch {
    // Storage unavailable or malformed — fall back to the built-in defaults.
  }
  return null;
}

function saveSplitState<K extends string>(storageKey: string, state: PersistedSplit<K>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage disabled (e.g. private browsing) — the layout just won't persist.
  }
}

// One rail spans the Detail column's full height. `kinds` are pinned at
// its top; the line is a second, fully independent piece of state — a
// continuous pixel offset draggable across that whole height, not just the
// badge cluster. Dragging a bookmark past wherever the line currently sits
// attaches it there (the split); dragging it back above detaches it.
export function useSplitRail<K extends string>(kinds: readonly K[], storageKey: string) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [linePx, setLinePx] = useState<number | null>(null); // null = resting at the very bottom (unsplit)
  const [bottomKind, setBottomKind] = useState<K | null>(null);
  const [activeTop, setActiveTop] = useState<K>(kinds[0]);
  const [dragOffset, setDragOffset] = useState<{ kind: K; offsetY: number } | null>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate the persisted split layout on mount — a one-time read from a
  // non-reactive external store, not the cascading-update pattern this
  // rule otherwise guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadSplitState(storageKey, kinds);
    if (saved) {
      setLinePx(saved.linePx);
      setBottomKind(saved.bottomKind);
      setActiveTop(saved.activeTop);
    }
    setIsHydrated(true);
    // Only ever re-run if the storage key itself changes (a different
    // page/instance) — the kinds array identity is not meant to retrigger
    // hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist whenever the layout changes, gated on hydration having
  // finished so the initial default state doesn't overwrite a saved
  // layout before it's had a chance to load.
  useEffect(() => {
    if (!isHydrated) return;
    saveSplitState(storageKey, { linePx, bottomKind, activeTop });
  }, [isHydrated, storageKey, linePx, bottomKind, activeTop]);

  const topKinds = kinds.filter((kind) => kind !== bottomKind);
  const isSplit = bottomKind !== null;
  const resolvedTop = topKinds.includes(activeTop) ? activeTop : topKinds[0];

  function beginLineDrag(event: ReactPointerEvent) {
    // Splitting needs at least 2 kinds — with only one, there's nothing to
    // put on the other side of the line (e.g. Training Room's Detail
    // today). A real single-kind rail just can't split yet.
    if (kinds.length < 2) return;
    event.preventDefault();
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const startLinePx = linePx ?? rect.height;
    dragRef.current = { startY: event.clientY, startLinePx, railHeight: rect.height };

    function handleMove(moveEvent: PointerEvent) {
      if (!dragRef.current) return;
      const delta = moveEvent.clientY - dragRef.current.startY;
      const next = Math.min(dragRef.current.railHeight, Math.max(0, dragRef.current.startLinePx + delta));
      setLinePx(next);
    }

    function handleUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function beginBadgeDrag(event: ReactPointerEvent, kind: K) {
    if (kinds.length < 2) return;
    event.preventDefault();
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const threshold = linePx ?? rect.height;
    dragRef.current = { startY: event.clientY, startLinePx: threshold, railHeight: rect.height };
    setDragOffset({ kind, offsetY: 0 });

    function handleMove(moveEvent: PointerEvent) {
      if (!dragRef.current) return;
      setDragOffset({ kind, offsetY: moveEvent.clientY - dragRef.current.startY });
    }

    function handleUp(upEvent: PointerEvent) {
      const rail2 = railRef.current;
      if (dragRef.current && rail2) {
        const railRect = rail2.getBoundingClientRect();
        const cursorY = upEvent.clientY - railRect.top;
        if (cursorY > dragRef.current.startLinePx) {
          setBottomKind(kind);
          setLinePx(dragRef.current.startLinePx);
        } else if (bottomKind === kind) {
          setBottomKind(null);
        }
      }
      dragRef.current = null;
      setDragOffset(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return {
    railRef,
    linePx,
    topKinds,
    bottomKind,
    isSplit,
    activeTop: resolvedTop,
    selectTop: setActiveTop,
    beginLineDrag,
    beginBadgeDrag,
    dragOffset,
  };
}
