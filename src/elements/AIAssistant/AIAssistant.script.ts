import { useState } from "react";

export type AssistantPhase = "closed" | "open" | "closing";

// Owns the assistant's open/closed state. Grows in later phases to also
// own dock position and drag handling.
export function useAIAssistant() {
  const [phase, setPhase] = useState<AssistantPhase>("closed");

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

  return { phase, open, collapse, finishCollapse };
}
