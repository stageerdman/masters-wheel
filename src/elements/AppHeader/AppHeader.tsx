"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useHeaderActions } from "./AppHeader.context";
import { goHome, isHeaderHidden } from "./AppHeader.script";
import { ActionIsland } from "./children/ActionIsland/ActionIsland";
import position from "./AppHeader.position.module.css";
import styles from "./AppHeader.styles.module.css";

export function AppHeader() {
  const { island, brand, accessory } = useHeaderActions();
  const pathname = usePathname();
  const router = useRouter();
  const label = brand?.label ?? "Master's Wheel";
  const showLogo = brand?.showLogo ?? false;

  if (isHeaderHidden(pathname)) {
    return null;
  }

  return (
    <header className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.logoArea} data-construction>
        <button
          type="button"
          onClick={() => goHome(router)}
          aria-label={`${label} — back to Main Menu`}
          title="Back to Main Menu"
          className={`${styles.wordmarkLink} ${position.wordmarkLink}`}
          data-construction
        >
          {showLogo && (
            <Image
              src="/masters-wheel-logo.png"
              alt=""
              width={24}
              height={24}
              className={`${styles.logo} ${position.logo}`}
              data-construction
            />
          )}
          <span className={styles.wordmark} data-construction>
            {label}
          </span>
        </button>
      </div>
      <div className={position.islandArea} data-construction>
        {island && (
          <ActionIsland
            stateOptions={island.stateOptions}
            activeStateId={island.activeStateId}
            onStateChange={island.onStateChange}
            reviewed={island.reviewed}
            onToggleReviewed={island.onToggleReviewed}
            hasScorecard={island.hasScorecard}
            isGeneratingScorecard={island.isGeneratingScorecard}
            onGenerateScorecard={island.onGenerateScorecard}
          />
        )}
      </div>
      <div className={position.rightArea} data-construction>
        {accessory}
      </div>
    </header>
  );
}
