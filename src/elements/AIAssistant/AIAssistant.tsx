"use client";

import { AIAssistantTrigger } from "./children/AIAssistantTrigger/AIAssistantTrigger";
import { useAIAssistant } from "./AIAssistant.script";
import position from "./AIAssistant.position.module.css";
import styles from "./AIAssistant.styles.module.css";

// Lives on top of every environment. Mounted once from the root layout.
export function AIAssistant() {
  const { isOpen, open } = useAIAssistant();

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {!isOpen && <AIAssistantTrigger onOpen={open} />}
    </div>
  );
}
