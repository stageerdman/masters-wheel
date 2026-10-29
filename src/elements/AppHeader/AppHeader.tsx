"use client";

import { useHeaderActions } from "./AppHeader.context";
import { ActionIsland } from "./children/ActionIsland/ActionIsland";
import position from "./AppHeader.position.module.css";
import styles from "./AppHeader.styles.module.css";

export function AppHeader() {
  const { island } = useHeaderActions();

  return (
    <header className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.logoArea} data-construction>
        <span className={styles.wordmark} data-construction>
          Master&apos;s Circle
        </span>
      </div>
      <div className={position.islandArea} data-construction>
        {island && (
          <ActionIsland
            stateOptions={island.stateOptions}
            activeStateId={island.activeStateId}
            onStateChange={island.onStateChange}
          />
        )}
      </div>
      <div className={position.rightArea} data-construction />
    </header>
  );
}
