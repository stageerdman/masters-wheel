import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };
export type DockState = "left" | "center" | "hybrid";

// Owns the assistant's open/closed state and the active chat's content.
// Chat state lives here (not inside AIAssistantWindow) so it survives
// collapsing the window back to the icon — collapsing minimizes, it
// doesn't reset the conversation. Grows in later phases to also own
// multiple sessions/agents.
export function useAIAssistant() {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");

  function open() {
    setPhase("open");
  }

  // Starts the collapse transition; the window itself reports back via
  // finishCollapse once its exit transition has actually finished playing.
  function collapse() {
    setPhase("closing");
  }

  function finishCollapse() {
    setPhase((current) => (current === "closing" ? "closed" : current));
  }

  function sendMessage() {
    const text = composerValue.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setComposerValue("");
  }

  return {
    phase,
    open,
    collapse,
    finishCollapse,
    messages,
    composerValue,
    setComposerValue,
    sendMessage,
  };
}

// Below this viewport width, dragging is disabled entirely — the window
// stays left-docked (styled near-full-bleed by AIAssistantWindow's own
// narrow-viewport media query) rather than reconciling a 3-zone drag
// system with touch-sized screens.
const DRAG_DISABLED_BELOW_PX = 640;

function resolveDockState(clientX: number): DockState {
  const fraction = clientX / window.innerWidth;
  if (fraction < 0.3) return "left";
  if (fraction < 0.6) return "hybrid";
  return "center";
}

// Drag-to-dock state machine: which of the 3 discrete geometries is
// committed (dockState), which zone the cursor is currently over while
// dragging (dragZone, drives the drop-zone affordance), and the raw
// pointer delta since pointerdown (dragOffset, drives 1:1 cursor-follow
// while dragging). Mirrors useSplitRail's pointer-event shape: attach
// window listeners on pointerdown, tear them down on pointerup.
export function useWindowDock() {
  const [dockState, setDockState] = useState<DockState>("left");
  const [dragZone, setDragZone] = useState<DockState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  function onHeaderPointerDown(event: ReactPointerEvent) {
    if (window.innerWidth < DRAG_DISABLED_BELOW_PX) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    setDragZone(resolveDockState(startX));
    setDragOffset({ x: 0, y: 0 });

    function handleMove(moveEvent: PointerEvent) {
      setDragZone(resolveDockState(moveEvent.clientX));
      setDragOffset({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
    }

    function handleUp(upEvent: PointerEvent) {
      setDockState(resolveDockState(upEvent.clientX));
      setDragZone(null);
      setDragOffset(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return { dockState, dragZone, dragOffset, onHeaderPointerDown };
}
