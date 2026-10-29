"use client";

// Not part of the Name.tsx/styles/position/script convention — a small
// cross-cutting module, like PerformanceReview.data.ts. AppHeader lives in
// layout.tsx, above every page, so a page that wants a dynamic-island button
// set pushes it here via useSetHeaderIsland rather than AppHeader reaching
// down into page state.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type HeaderIslandOption = {
  id: string;
  glyph: string;
  color: string;
  label: string;
};

export type HeaderIsland = {
  stateOptions: HeaderIslandOption[];
  activeStateId: string;
  onStateChange: (id: string) => void;
} | null;

type HeaderActionsContextValue = {
  island: HeaderIsland;
  setIsland: (island: HeaderIsland) => void;
};

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [island, setIsland] = useState<HeaderIsland>(null);
  const value = useMemo(() => ({ island, setIsland }), [island]);
  return <HeaderActionsContext.Provider value={value}>{children}</HeaderActionsContext.Provider>;
}

export function useHeaderActions() {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error("useHeaderActions must be used within HeaderActionsProvider");
  }
  return context;
}
