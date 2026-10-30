import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type DockState = "left" | "center";
export type PresetOverride = { left: number; top: number; width: number; height: number };
export type PresetOverrides = Partial<Record<DockState, PresetOverride>>;

// Below this viewport width, dragging is disabled entirely — the window
// stays left-docked (styled near-full-bleed by AIAssistantWindow's own
// narrow-viewport media query) rather than reconciling a 2-zone drag
// system with touch-sized screens.
const DRAG_DISABLED_BELOW_PX = 640;

function resolveDockState(clientX: number): DockState {
  const fraction = clientX / window.innerWidth;
  return fraction < 0.5 ? "left" : "center";
}

const MIN_MANUAL_WIDTH_PX = 260;
const MIN_MANUAL_HEIGHT_PX = 320;

// Holding Option/Alt during a header drag or a corner resize doesn't pick
// a different dock, or escape to some separate freeform mode — it
// redefines whichever preset you're currently docked in, permanently
// (persisted across reloads): wherever you drop it becomes that preset's
// new left/center, in place of its built-in default geometry. A
// plain (non-Option) drag still always snaps to the nearest of the 2
// presets, now rendering with its override if one has been set.
const PRESET_OVERRIDES_STORAGE_KEY = "ai-assistant-preset-overrides";

function loadPresetOverrides(): PresetOverrides {
  try {
    const raw = localStorage.getItem(PRESET_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as PresetOverrides;
  } catch {
    // Storage unavailable or malformed — fall back to the built-in defaults.
  }
  return {};
}

function savePresetOverrides(overrides: PresetOverrides) {
  try {
    localStorage.setItem(PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Storage disabled (e.g. private browsing) — overrides just won't persist.
  }
}

// Root cause of a real, confirmed bug (not a guess — found via logged
// getComputedStyle output): a persisted override captured against one
// window size keeps getting applied verbatim forever, even once the
// window is a completely different size (a different machine, a resized
// Tauri window, a display change). The dock classes only ever set
// `bottom`, never `top` — but this hook's `top`-based override, applied
// as an inline style, wins over the class's `bottom` when both are
// present (the browser resolves top+height+bottom as over-constrained by
// honoring top), so a stale override silently relocates the whole window
// off-screen with zero error. The wiki for this feature already flagged
// "no way to clear a bad override" as a known risk — this is that risk,
// materialized. Fix: never trust a persisted override blindly — check it
// still lands within the current viewport before applying it, and drop
// (and re-persist without) anything that doesn't.
function isOverrideOnScreen(override: PresetOverride): boolean {
  if (typeof window === "undefined") return true;
  const withinX = override.left >= -1 && override.left + override.width <= window.innerWidth + 1;
  const withinY = override.top >= -1 && override.top + override.height <= window.innerHeight + 1;
  return withinX && withinY;
}

function sanitizePresetOverrides(overrides: PresetOverrides): PresetOverrides {
  const clean: PresetOverrides = {};
  for (const [key, override] of Object.entries(overrides)) {
    if (override && isOverrideOnScreen(override)) clean[key as DockState] = override;
  }
  return clean;
}

// Drag-to-dock state machine: which of the 2 presets is committed
// (dockState), which preset zone the cursor is currently over while
// dragging (dragZone, drives the drop-zone affordance — null during an
// Option/redefine drag, since there's no zone to snap to, you're staying
// in the preset you started in), and the raw pointer delta since
// pointerdown (dragOffset, drives 1:1 cursor-follow while dragging).
// Mirrors useSplitRail's pointer-event shape: attach window listeners on
// pointerdown, tear them down on pointerup.
//
// Also owns manual resize (dragging the window's top-right corner): the
// user can freely resize whichever dock state is active, but redocking
// (releasing a non-Option header drag) always clears the ephemeral
// override and renders that zone's current definition (its persisted
// override if one exists, otherwise the built-in default). Side-menu
// open/closed lives here too — it's independent of dockState, toggled
// from the window's header.
//
// Lives in its own file, separate from AIAssistant.script.ts's chat/
// session state — both have to live at the AIAssistant level (so they
// survive the window unmounting on collapse), but they're otherwise
// unrelated concerns, and this one is sizable enough to deserve its own
// space (same reasoning AIAssistantWindow.data.ts already applies
// alongside AIAssistantWindow.script.ts).
export function useWindowDock() {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [dockState, setDockState] = useState<DockState>("left");
  const [dragZone, setDragZone] = useState<DockState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [manualSize, setManualSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [presetOverrides, setPresetOverrides] = useState<PresetOverrides>({});
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  // Hydrate from localStorage on mount — any previously redefined
  // presets become the window's starting geometry from now on.
  // localStorage isn't available during SSR, so this can't be a lazy
  // useState initializer; it has to run client-side, once, after mount —
  // a one-time hydration from a non-reactive external store, not the
  // cascading-update pattern this rule otherwise guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadPresetOverrides();
    const sane = sanitizePresetOverrides(saved);
    if (Object.keys(sane).length > 0) setPresetOverrides(sane);
    if (Object.keys(sane).length !== Object.keys(saved).length) savePresetOverrides(sane);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function onHeaderPointerDown(event: ReactPointerEvent) {
    if (window.innerWidth < DRAG_DISABLED_BELOW_PX) return;
    event.preventDefault();
    const isRedefining = event.altKey;
    const startRect = windowRef.current?.getBoundingClientRect();
    const startDockState = dockState;
    const startX = event.clientX;
    const startY = event.clientY;
    if (!isRedefining) setDragZone(resolveDockState(startX));
    setDragOffset({ x: 0, y: 0 });

    function handleMove(moveEvent: PointerEvent) {
      if (!isRedefining) setDragZone(resolveDockState(moveEvent.clientX));
      setDragOffset({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
    }

    function handleUp(upEvent: PointerEvent) {
      if (isRedefining && startRect) {
        const override: PresetOverride = {
          left: startRect.left + (upEvent.clientX - startX),
          top: startRect.top + (upEvent.clientY - startY),
          width: startRect.width,
          height: startRect.height,
        };
        setPresetOverrides((current) => {
          const next = { ...current, [startDockState]: override };
          savePresetOverrides(next);
          return next;
        });
        // dockState doesn't change — redefining stays in the same preset.
      } else {
        setDockState(resolveDockState(upEvent.clientX));
        setManualSize(null);
      }
      setDragZone(null);
      setDragOffset(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function onResizeHandlePointerDown(event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const node = windowRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const isRedefining = event.altKey;
    const startDockState = dockState;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const bottomEdge = rect.top + rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    setIsResizing(true);

    function handleMove(moveEvent: PointerEvent) {
      const nextWidth = Math.max(MIN_MANUAL_WIDTH_PX, startWidth + (moveEvent.clientX - startX));
      const nextHeight = Math.max(MIN_MANUAL_HEIGHT_PX, startHeight - (moveEvent.clientY - startY));
      if (isRedefining) {
        setPresetOverrides((current) => ({
          ...current,
          [startDockState]: { left: startLeft, top: bottomEdge - nextHeight, width: nextWidth, height: nextHeight },
        }));
      } else {
        setManualSize({ width: nextWidth, height: nextHeight });
      }
    }

    function handleUp() {
      setIsResizing(false);
      if (isRedefining) {
        setPresetOverrides((current) => {
          savePresetOverrides(current);
          return current;
        });
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function toggleSideMenu() {
    setIsSideMenuOpen((current) => !current);
  }

  // Picking an agent (AgentStrip or AgentPicker) should drop straight
  // into the new chat, not leave the history/agents panel sitting open
  // over it — called alongside selectAgent, not merged into it, since
  // dock/sidebar state and chat state are deliberately separate concerns
  // (see this hook's own module-level comment vs. AIAssistant.script.ts's).
  function closeSideMenu() {
    setIsSideMenuOpen(false);
  }

  return {
    windowRef,
    dockState,
    dragZone,
    dragOffset,
    onHeaderPointerDown,
    manualSize,
    isResizing,
    onResizeHandlePointerDown,
    presetOverrides,
    isSideMenuOpen,
    toggleSideMenu,
    closeSideMenu,
  };
}
