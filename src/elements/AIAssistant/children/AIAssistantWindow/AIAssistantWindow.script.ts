import { useEffect, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import type { PresetOverride } from "@/elements/AIAssistant/AIAssistant.windowDock.script";

// Drives the mount-in transition: render first at the "entering" (shrunk,
// transparent) visual state, then flip to "entered" one frame later so the
// CSS transition actually animates instead of snapping straight to open.
export function useWindowEnterTransition() {
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return hasEntered;
}

type UseWindowGeometryArgs = {
  isClosing: boolean;
  hasEntered: boolean;
  dragOffset: { x: number; y: number } | null;
  manualSize: { width: number; height: number } | null;
  activeOverride: PresetOverride | undefined;
};

// Computes the root node's inline style for every case that can't be
// expressed as a plain CSS class: live drag-follow, an ephemeral preset
// resize, or a persisted preset override. Kept out of the .tsx — this
// exact logic has already been the source of two real bugs (a stray
// centering transform stacking under an absolute override), and that
// kind of thing belongs somewhere it can be read and fixed on its own,
// not buried in JSX.
export function useWindowGeometry({ isClosing, hasEntered, dragOffset, manualSize, activeOverride }: UseWindowGeometryArgs) {
  const showCollapsedGeometry = !hasEntered || isClosing;

  const style: CSSProperties = {};
  if (dragOffset) {
    Object.assign(style, { "--drag-x": `${dragOffset.x}px`, "--drag-y": `${dragOffset.y}px` });
  }
  if (manualSize && !showCollapsedGeometry) {
    // Ephemeral resize of the current preset — overrides width/height
    // (and top, so the bottom edge stays flush); clears the moment the
    // window redocks.
    Object.assign(style, {
      width: `${manualSize.width}px`,
      height: `${manualSize.height}px`,
      top: `calc(100vh - ${manualSize.height}px)`,
    });
  } else if (activeOverride && !showCollapsedGeometry) {
    // The current preset has been Option-redefined — exact pixels,
    // persisted, takes over from its built-in default geometry. Also
    // overrides `transform`: the dock classes bake in a percentage-based
    // centering transform (e.g. dockCenter's translate(-50%, 0), relative
    // to the box's own width) which must NOT stack on top of an already-
    // absolute override left — left untouched, that extra -50% silently
    // shifts the box left by half its width every render.
    Object.assign(style, {
      left: `${activeOverride.left}px`,
      top: `${activeOverride.top}px`,
      width: `${activeOverride.width}px`,
      height: `${activeOverride.height}px`,
      transform: dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : "translate(0, 0)",
    });
  }

  return {
    showCollapsedGeometry,
    style: Object.keys(style).length > 0 ? style : undefined,
  };
}

// The chat column's drag-and-drop target state for dropping an
// AgentRoster card into the active conversation.
export function useChatDropTarget(onDropAgentIntoChat: (agentId: string) => void) {
  const [isDragOver, setIsDragOver] = useState(false);

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave() {
    setIsDragOver(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const agentId = event.dataTransfer.getData("text/plain");
    if (agentId) onDropAgentIntoChat(agentId);
  }

  return { isDragOver, onDragOver, onDragLeave, onDrop };
}
