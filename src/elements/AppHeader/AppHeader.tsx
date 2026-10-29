"use client";

import Image from "next/image";
import Link from "next/link";
import { useHeaderActions } from "./AppHeader.context";
import { ActionIsland } from "./children/ActionIsland/ActionIsland";
import position from "./AppHeader.position.module.css";
import styles from "./AppHeader.styles.module.css";

export function AppHeader() {
  const { island, brand } = useHeaderActions();
  const label = brand?.label ?? "Master's Circle";
  const showLogo = brand?.showLogo ?? false;

  return (
    <header className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.logoArea} data-construction>
        <Link href="/" className={`${styles.wordmarkLink} ${position.wordmarkLink}`} data-construction>
          {showLogo && (
            <Image
              src="/masters-wheel-logo.png"
              alt=""
              width={28}
              height={28}
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
          />
        )}
      </div>
      <div className={position.rightArea} data-construction />
    </header>
  );
}
