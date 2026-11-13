import type { ReactNode } from "react";
import position from "./KindIcon.position.module.css";
import styles from "./KindIcon.styles.module.css";

// Line icons for Performance Review's Detail bookmarks — drawn on a 24×24
// grid in `currentColor`, so the badge they sit on decides their color
// (see BookmarkBadge's --color-on-chip). Each one is its own named export
// so PerformanceReview.data.ts can reference it from CONTENT_KIND_META
// without needing JSX there.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={`${styles.root} ${position.root}`}
      data-construction
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Question mark + line over a checkmark + line: a question, then its answer.
export function QuestionsIcon() {
  return (
    <Icon>
      <path d="M3.5 5.2a2.4 2.4 0 1 1 3.3 2.2c-.5.2-.8.7-.8 1.2v.4" />
      <path d="M6 11.6h.01" />
      <path d="M11 7h10" />
      <path d="M3 17l2 2 4-4.5" />
      <path d="M11 17h10" />
    </Icon>
  );
}

// Person profile.
export function ClientCardIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
  );
}

// Rising bar chart.
export function ScorecardIcon() {
  return (
    <Icon>
      <path d="M4 20h16" />
      <path d="M7 16v-3" />
      <path d="M12 16V9" />
      <path d="M17 16V5" />
    </Icon>
  );
}

// Closed-captions "CC".
export function TranscriptIcon() {
  return (
    <Icon>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M10.1 10.4A2.2 2.2 0 1 0 10.1 13.6" />
      <path d="M17.1 10.4A2.2 2.2 0 1 0 17.1 13.6" />
    </Icon>
  );
}
