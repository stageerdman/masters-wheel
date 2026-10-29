import { useState } from "react";

export type AssistantPhase = "closed" | "open" | "closing";
export type ChatMessageRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatMessageRole; text: string };

// Owns the assistant's open/closed state and the active chat's content.
// Chat state lives here (not inside AIAssistantWindow) so it survives
// collapsing the window back to the icon — collapsing minimizes, it
// doesn't reset the conversation. Grows in later phases to also own dock
// position, drag handling, and multiple sessions/agents.
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
