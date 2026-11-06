"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackgroundImage } from "./children/BackgroundImage/BackgroundImage";
import { NavMenu, type NavMenuEntry } from "./children/NavMenu/NavMenu";
import { SidePanel } from "./children/SidePanel/SidePanel";
import { SpaceSwitcher } from "./children/SpaceSwitcher/SpaceSwitcher";
import position from "./MainMenu.position.module.css";
import styles from "./MainMenu.styles.module.css";

const MENU_ITEMS: NavMenuEntry[] = [
  { id: "performance-review", label: "Performance Review" },
  { id: "analytics", label: "Analytics" },
  { id: "training", label: "Training" },
  { id: "chat", label: "Chat with AI" },
  { id: "agents", label: "Agents" },
];

export function MainMenu() {
  const router = useRouter();
  const [panelContent, setPanelContent] = useState<"analytics" | null>(null);

  function handleActivate(id: string) {
    if (id === "performance-review") {
      router.push("/performance-review");
    } else if (id === "agents") {
      router.push("/agents");
    } else if (id === "chat") {
      router.push("/chat");
    } else if (id === "analytics") {
      setPanelContent((current) => (current === "analytics" ? null : "analytics"));
    } else {
      setPanelContent(null);
    }
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <BackgroundImage />
      <div className={position.spaceSwitcherSlot} data-construction>
        <SpaceSwitcher />
      </div>
      <div className={position.content} data-construction>
        <NavMenu items={MENU_ITEMS} onActivate={handleActivate} />
        <SidePanel content={panelContent} />
      </div>
    </div>
  );
}
