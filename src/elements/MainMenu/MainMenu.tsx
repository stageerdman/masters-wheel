"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavMenu, type NavMenuEntry } from "./children/NavMenu/NavMenu";
import { SidePanel } from "./children/SidePanel/SidePanel";
import position from "./MainMenu.position.module.css";
import styles from "./MainMenu.styles.module.css";

const MENU_ITEMS: NavMenuEntry[] = [
  { id: "performance-review", label: "Performance Review" },
  { id: "analytics", label: "Analytics" },
  { id: "training", label: "Training" },
  { id: "chat", label: "Chat with AI" },
];

export function MainMenu() {
  const router = useRouter();
  const [panelContent, setPanelContent] = useState<"analytics" | null>(null);

  function handleActivate(id: string) {
    if (id === "performance-review") {
      router.push("/performance-review");
    } else if (id === "analytics") {
      setPanelContent("analytics");
    } else {
      setPanelContent(null);
    }
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <NavMenu items={MENU_ITEMS} onActivate={handleActivate} />
      <SidePanel content={panelContent} />
    </div>
  );
}
