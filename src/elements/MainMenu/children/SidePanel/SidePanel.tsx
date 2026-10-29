"use client";

import { useState } from "react";
import { AnalyticsPanel } from "./children/AnalyticsPanel/AnalyticsPanel";
import position from "./SidePanel.position.module.css";
import styles from "./SidePanel.styles.module.css";

type SidePanelContent = "analytics" | null;

type SidePanelProps = {
  content: SidePanelContent;
};

export function SidePanel({ content }: SidePanelProps) {
  const [prevContent, setPrevContent] = useState<SidePanelContent>(content);
  const [mounted, setMounted] = useState(content !== null);
  const [closing, setClosing] = useState(false);
  const [renderedContent, setRenderedContent] = useState<SidePanelContent>(content);

  if (content !== prevContent) {
    setPrevContent(content);
    if (content) {
      setRenderedContent(content);
      setMounted(true);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  function handleAnimationEnd() {
    if (closing) {
      setMounted(false);
      setClosing(false);
      setRenderedContent(null);
    }
  }

  return (
    <div
      className={`${styles.root} ${position.root} ${mounted ? styles.filled : ""} ${
        closing ? styles.popOut : mounted ? styles.popIn : ""
      }`}
      data-construction
      onAnimationEnd={handleAnimationEnd}
    >
      {mounted && renderedContent === "analytics" && <AnalyticsPanel />}
    </div>
  );
}
