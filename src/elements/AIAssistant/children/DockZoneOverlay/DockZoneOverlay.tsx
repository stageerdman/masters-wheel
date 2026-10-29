import type { DockState } from "@/elements/AIAssistant/AIAssistant.script";
import position from "./DockZoneOverlay.position.module.css";
import styles from "./DockZoneOverlay.styles.module.css";

type DockZoneOverlayProps = {
  activeZone: DockState | null;
};

const ZONES: DockState[] = ["left", "hybrid", "center"];

// Faint full-height bands marking the 3 dock zones, shown only while
// dragging the window's header; the zone under the cursor highlights.
export function DockZoneOverlay({ activeZone }: DockZoneOverlayProps) {
  if (!activeZone) return null;

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      {ZONES.map((zone) => (
        <div
          key={zone}
          className={`${styles.band} ${position.band} ${zone === activeZone ? styles.active : ""}`}
          data-construction
        />
      ))}
    </div>
  );
}
