import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AGENTS, HISTORY_FIXTURES } from "./children/AIAssistantWindow/AIAssistantWindow.data";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };
export type DockState = "left" | "center" | "hybrid" | "custom";
export type Agent = { id: string; name: string; tagline: string; initial: string };
export type ChatSession = {
  id: string;
  title: string;
  relativeDate: string;
  messages: ChatMessage[];
  activeAgentIds: string[];
  agentId?: string;
};

const NEW_SESSION_ID = "current";

function makeNewSession(): ChatSession {
  return { id: NEW_SESSION_ID, title: "New chat", relativeDate: "Now", messages: [], activeAgentIds: [] };
}

// Owns the assistant's open/closed state and every chat session's
// content. Lives here (not inside AIAssistantWindow) so it survives
// collapsing the window back to the icon — collapsing minimizes, it
// doesn't reset the conversation.
export function useAIAssistant() {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const [sessions, setSessions] = useState<ChatSession[]>([makeNewSession(), ...HISTORY_FIXTURES]);
  const [activeSessionId, setActiveSessionId] = useState(NEW_SESSION_ID);
  const [composerValue, setComposerValue] = useState("");

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

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

  function selectSession(id: string) {
    setActiveSessionId(id);
  }

  function appendMessageToActive(message: ChatMessage) {
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId ? { ...session, messages: [...session.messages, message] } : session,
      ),
    );
  }

  function sendMessage() {
    const text = composerValue.trim();
    if (!text) return;
    appendMessageToActive({ id: crypto.randomUUID(), role: "user", text });
    setComposerValue("");
  }

  // Selecting an agent (vs. dragging one into the current chat) switches
  // to a dedicated session with that agent, creating it on first select.
  function selectAgent(agentId: string) {
    const existing = sessions.find((session) => session.agentId === agentId);
    if (existing) {
      setActiveSessionId(existing.id);
      return;
    }
    const agent = AGENTS.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat with ${agent.name}`,
      relativeDate: "Now",
      messages: [],
      activeAgentIds: [],
      agentId,
    };
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
  }

  function addAgentToActiveChat(agentId: string) {
    const agent = AGENTS.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== activeSessionId || session.activeAgentIds.includes(agentId)) return session;
        return {
          ...session,
          activeAgentIds: [...session.activeAgentIds, agentId],
          messages: [
            ...session.messages,
            { id: crypto.randomUUID(), role: "system", text: `${agent.name} added to the conversation` },
          ],
        };
      }),
    );
  }

  function removeAgentFromActiveChat(agentId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId
          ? { ...session, activeAgentIds: session.activeAgentIds.filter((id) => id !== agentId) }
          : session,
      ),
    );
  }

  return {
    phase,
    open,
    collapse,
    finishCollapse,
    sessions,
    activeSessionId,
    activeSession,
    selectSession,
    composerValue,
    setComposerValue,
    sendMessage,
    agents: AGENTS,
    selectAgent,
    addAgentToActiveChat,
    removeAgentFromActiveChat,
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

const MIN_MANUAL_WIDTH_PX = 260;
const MIN_MANUAL_HEIGHT_PX = 320;

export type CustomPlacement = { left: number; top: number; width: number; height: number };

// Holding Option/Alt during a header drag or a corner resize switches
// that gesture from "snap to one of the 3 presets" to "place/size it
// exactly where I want," persisted across reloads — a lightweight way to
// retune the assistant's default position without touching CSS.
const CUSTOM_PLACEMENT_STORAGE_KEY = "ai-assistant-custom-placement";

function loadCustomPlacement(): CustomPlacement | null {
  try {
    const raw = localStorage.getItem(CUSTOM_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.left === "number" &&
      typeof parsed?.top === "number" &&
      typeof parsed?.width === "number" &&
      typeof parsed?.height === "number"
    ) {
      return parsed;
    }
  } catch {
    // Storage unavailable or malformed — fall back to the presets.
  }
  return null;
}

function saveCustomPlacement(placement: CustomPlacement) {
  try {
    localStorage.setItem(CUSTOM_PLACEMENT_STORAGE_KEY, JSON.stringify(placement));
  } catch {
    // Storage disabled (e.g. private browsing) — placement just won't persist.
  }
}

// Drag-to-dock state machine: which of the 4 geometries is committed
// (dockState — 3 presets plus "custom"), which preset zone the cursor is
// currently over while dragging (dragZone, drives the drop-zone
// affordance — null during a freeform/Option drag, since there's no
// zone to snap to), and the raw pointer delta since pointerdown
// (dragOffset, drives 1:1 cursor-follow while dragging). Mirrors
// useSplitRail's pointer-event shape: attach window listeners on
// pointerdown, tear them down on pointerup.
//
// Also owns manual resize (dragging the window's top-right corner): the
// user can freely resize whichever dock state is active, but redocking
// (releasing a non-Option header drag) always clears the override and
// snaps back to that zone's predefined size. Holding Option while
// resizing behaves like Option-dragging: it commits a custom placement
// instead of an ephemeral one. Side-menu open/closed lives here too —
// it's independent of dockState, toggled from the window's header.
export function useWindowDock() {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [dockState, setDockState] = useState<DockState>("left");
  const [dragZone, setDragZone] = useState<DockState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [manualSize, setManualSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [customPlacement, setCustomPlacement] = useState<CustomPlacement | null>(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  // Hydrate from localStorage on mount — a previously saved custom spot
  // becomes the window's starting placement from now on. localStorage
  // isn't available during SSR, so this can't be a lazy useState
  // initializer; it has to run client-side, once, after mount — a
  // one-time hydration from a non-reactive external store, not the
  // cascading-update pattern this rule otherwise guards against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadCustomPlacement();
    if (saved) {
      setCustomPlacement(saved);
      setDockState("custom");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function onHeaderPointerDown(event: ReactPointerEvent) {
    if (window.innerWidth < DRAG_DISABLED_BELOW_PX) return;
    event.preventDefault();
    const isFreeform = event.altKey;
    const startRect = windowRef.current?.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    if (!isFreeform) setDragZone(resolveDockState(startX));
    setDragOffset({ x: 0, y: 0 });

    function handleMove(moveEvent: PointerEvent) {
      if (!isFreeform) setDragZone(resolveDockState(moveEvent.clientX));
      setDragOffset({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
    }

    function handleUp(upEvent: PointerEvent) {
      if (isFreeform && startRect) {
        const placement: CustomPlacement = {
          left: startRect.left + (upEvent.clientX - startX),
          top: startRect.top + (upEvent.clientY - startY),
          width: startRect.width,
          height: startRect.height,
        };
        setCustomPlacement(placement);
        setDockState("custom");
        saveCustomPlacement(placement);
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
    const isFreeform = event.altKey;
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
      if (isFreeform) {
        setCustomPlacement({ left: startLeft, top: bottomEdge - nextHeight, width: nextWidth, height: nextHeight });
        setDockState("custom");
      } else {
        setManualSize({ width: nextWidth, height: nextHeight });
      }
    }

    function handleUp() {
      setIsResizing(false);
      if (isFreeform) {
        setCustomPlacement((current) => {
          if (current) saveCustomPlacement(current);
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

  return {
    windowRef,
    dockState,
    dragZone,
    dragOffset,
    onHeaderPointerDown,
    manualSize,
    isResizing,
    onResizeHandlePointerDown,
    customPlacement,
    isSideMenuOpen,
    toggleSideMenu,
  };
}
