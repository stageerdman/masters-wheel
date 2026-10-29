import { useState } from "react";

// Owns the assistant's open/closed state. Grows in later phases to also
// own dock position and drag handling.
export function useAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  function open() {
    setIsOpen(true);
  }

  function collapse() {
    setIsOpen(false);
  }

  return { isOpen, open, collapse };
}
