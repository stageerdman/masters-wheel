import type { ContextUsage } from "@/lib/chat";
import { formatTokenCount } from "@/lib/formatTokenCount";
import position from "./ContextUsageGauge.position.module.css";
import styles from "./ContextUsageGauge.styles.module.css";

type ContextUsageGaugeProps = {
  usage: ContextUsage | null;
};

// 0 at one end, 50 at the midpoint, 100 at the other — interpolated in
// two segments so it passes through the amber midpoint rather than
// blending green straight to red. Deliberately reuses the app's existing
// status colors (closed/postponed/failed) as a green→amber→red ramp
// instead of declaring new ones — same "closed = good, failed = bad"
// vocabulary this app already uses elsewhere, just applied to context
// fullness instead of a call outcome.
function fillColor(percent: number): string {
  if (percent <= 50) {
    return `color-mix(in srgb, var(--color-status-postponed) ${(percent / 50) * 100}%, var(--color-status-closed))`;
  }
  return `color-mix(in srgb, var(--color-status-failed) ${((percent - 50) / 50) * 100}%, var(--color-status-postponed))`;
}

// Shown in a chat's right-click menu (see HistoryListItem) — how full the
// most-at-risk agent's resumed CLI session context is, as a 0-100 bar
// plus the raw token count. `usage` is null for a chat nobody has
// replied in yet, or `window` is 0 if a reply came back without usage
// data (an older CLI) — either way there's nothing real to show.
export function ContextUsageGauge({ usage }: ContextUsageGaugeProps) {
  if (!usage || usage.window === 0) {
    return (
      <p className={`${styles.empty} ${position.empty}`} data-construction>
        No context yet
      </p>
    );
  }

  const percent = Math.min(100, Math.round((usage.tokens / usage.window) * 100));

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <div className={`${styles.track} ${position.track}`} data-construction>
        <div
          className={`${styles.fill} ${position.fill}`}
          data-construction
          style={{ width: `${percent}%`, background: fillColor(percent) }}
        />
      </div>
      <span className={`${styles.label} ${position.label}`} data-construction>
        {percent}% context · {formatTokenCount(usage.tokens)} tokens
      </span>
    </div>
  );
}
