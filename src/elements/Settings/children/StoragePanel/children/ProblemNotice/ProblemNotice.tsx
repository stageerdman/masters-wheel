"use client";

import type { Notice, NoticeAction } from "@/lib/onedrive";
import position from "./ProblemNotice.position.module.css";
import styles from "./ProblemNotice.styles.module.css";

type ProblemNoticeProps = {
  notice: Notice;
  busy: boolean;
  onAction: (action: Exclude<NoticeAction, null>) => void;
};

const LABELS: Record<Exclude<NoticeAction, null>, string> = {
  signIn: "Sign in again",
  manageStorage: "Manage storage",
  retry: "Try again",
};

// The one place a storage problem gets fixed (SPEC 5.6): one problem, at
// most one button.
export function ProblemNotice({ notice, busy, onAction }: ProblemNoticeProps) {
  const { action } = notice;
  return (
    <div className={`${styles.root} ${position.root}`} data-construction role="status">
      <p className={`${styles.text} ${position.text}`} data-construction>
        <strong>{notice.lead}</strong>
        {notice.rest}
      </p>
      {action && (
        <button
          type="button"
          className={`${styles.button} ${position.button}`}
          data-construction
          disabled={busy}
          onClick={() => onAction(action)}
        >
          {busy && action === "signIn" ? "Waiting for Microsoft sign-in…" : LABELS[action]}
        </button>
      )}
    </div>
  );
}
