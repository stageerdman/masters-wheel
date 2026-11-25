"use client";

import position from "./AccountBlock.position.module.css";
import styles from "./AccountBlock.styles.module.css";

type AccountBlockProps = {
  account: string | null;
  onShowInOneDrive: () => void;
};

// Who is connected and where the videos go (SPEC 5.4, item 2).
export function AccountBlock({ account, onShowInOneDrive }: AccountBlockProps) {
  return (
    <div className={position.root} data-construction>
      <span className={`${styles.label} ${position.line}`} data-construction>
        OneDrive
      </span>
      <p className={`${styles.body} ${position.line}`} data-construction>
        Connected as <strong>{account ?? "your Microsoft account"}</strong>
      </p>
      <p className={`${styles.muted} ${position.line} ${position.folder}`} data-construction>
        Videos go to OneDrive › Apps › Master&apos;s Wheel
        <button type="button" className={`${styles.textButton} ${position.textButton}`} data-construction onClick={onShowInOneDrive}>
          Show in OneDrive
        </button>
      </p>
    </div>
  );
}
