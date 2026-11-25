"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderActions } from "./AppHeader.context";
import { ActionIsland } from "./children/ActionIsland/ActionIsland";
import position from "./AppHeader.position.module.css";
import styles from "./AppHeader.styles.module.css";

// Main Menu is the minimal front door — no chrome above it.
const HEADER_HIDDEN_ROUTES = ["/"];

export function AppHeader() {
  const { island, brand, accessory } = useHeaderActions();
  const pathname = usePathname();
  const label = brand?.label ?? "Master's Wheel";
  const showLogo = brand?.showLogo ?? false;

  if (HEADER_HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <header className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.logoArea} data-construction>
        <Link href="/" className={`${styles.wordmarkLink} ${position.wordmarkLink}`} data-construction>
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
        </Link>
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
