"use client";

// Not part of the Name.tsx/styles/position/script convention — a small
// cross-cutting module, same shape as AppHeader.context.tsx. Lets any
// mounted component (today: ChatRoleplaySession's AITrainerPane) tell the
// globally-mounted floating AIAssistant to hide itself while a second,
// docked-inline instance of the same engine is on screen elsewhere on the
// page — the same route-based HIDDEN_ON_ROUTES trick AIAssistant.tsx uses
// for the full-screen /chat route doesn't work here, since this happens on
// the same route (Training Room) only while a specific session is active.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AIAssistantVisibilityContextValue = {
  isFloatingHidden: boolean;
  setFloatingHidden: (hidden: boolean) => void;
};

const AIAssistantVisibilityContext = createContext<AIAssistantVisibilityContextValue | null>(null);

export function AIAssistantVisibilityProvider({ children }: { children: ReactNode }) {
  const [isFloatingHidden, setFloatingHidden] = useState(false);
  const value = useMemo(() => ({ isFloatingHidden, setFloatingHidden }), [isFloatingHidden]);
  return <AIAssistantVisibilityContext.Provider value={value}>{children}</AIAssistantVisibilityContext.Provider>;
}

export function useAIAssistantVisibility() {
  const context = useContext(AIAssistantVisibilityContext);
  if (!context) {
    throw new Error("useAIAssistantVisibility must be used within AIAssistantVisibilityProvider");
  }
  return context;
}
