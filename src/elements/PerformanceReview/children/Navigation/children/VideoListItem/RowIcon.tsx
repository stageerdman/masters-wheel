import type { BackupMark } from "@/elements/PerformanceReview/PerformanceReview.data";

export type RowIconName = NonNullable<BackupMark>["icon"] | "reviewed";

// One line set for a session row's marks: 16-unit grid, 1.5 stroke, round
// caps and joins, colour from currentColor. Cloud = OneDrive, laptop = this
// Mac; they add up (cloud + laptop = both). Storage never uses a check: the
// only check on a row means Reviewed, as in the header toggle.
// See docs/session-row-icons/03-ui-spec.md.
const CLOUD = "M4.5 12.5H11.75A2.75 2.75 0 0 0 12 7.01A4.25 4.25 0 0 0 3.9 7.6A2.5 2.5 0 0 0 4.5 12.5Z";

const PATHS: Record<RowIconName, string[]> = {
  cloud: [CLOUD],
  cloudDevice: [
    "M2.7 7.5H7.05A1.65 1.65 0 0 0 7.2 4.21A2.55 2.55 0 0 0 2.34 4.56A1.5 1.5 0 0 0 2.7 7.5Z",
    "M8.75 8.5H13.25A.75 .75 0 0 1 14 9.25V12.5H8V9.25A.75 .75 0 0 1 8.75 8.5Z",
    "M7 14.5H15",
  ],
  device: ["M4 3.5H12A1 1 0 0 1 13 4.5V10.5H3V4.5A1 1 0 0 1 4 3.5Z", "M1.75 12.5H14.25"],
  cloudUp: [CLOUD, "M8 11V7.75", "M6.5 9.25L8 7.75L9.5 9.25"],
  cloudAlert: [CLOUD, "M8 7.25V9.25", "M8 11.1V11.15"],
  reviewed: ["M8 1.75A6.25 6.25 0 1 1 8 14.25A6.25 6.25 0 1 1 8 1.75Z", "M5.25 8.25L7.1 10L10.75 6.25"],
};

type RowIconProps = { name: RowIconName };

// Decorative drawing only: the slot around it carries role, title and
// aria-label, so the words live in one place.
export function RowIcon({ name }: RowIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
