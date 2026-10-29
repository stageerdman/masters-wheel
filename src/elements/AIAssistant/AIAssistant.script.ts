import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AGENTS, HISTORY_FIXTURES } from "./children/AIAssistantWindow/AIAssistantWindow.data";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };
export type DockState = "left" | "center";
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
  return fraction < 0.5 ? "left" : "center";
}

const MIN_MANUAL_WIDTH_PX = 260;
const MIN_MANUAL_HEIGHT_PX = 320;

export type PresetOverride = { left: number; top: number; width: number; height: number };
export type PresetOverrides = Partial<Record<DockState, PresetOverride>>;

// Holding Option/Alt during a header drag or a corner resize doesn't pick
// a different dock, or escape to some separate freeform mode — it
// redefines whichever preset you're currently docked in, permanently
// (persisted across reloads): wherever you drop it becomes that preset's
// new left/center, in place of its built-in default geometry. A
// plain (non-Option) drag still always snaps to the nearest of the 3
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
    if (Object.keys(saved).length > 0) setPresetOverrides(saved);
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
  };
}
