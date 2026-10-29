import type { DockState } from "@/elements/AIAssistant/AIAssistant.script";
import position from "./DockZoneOverlay.position.module.css";
import styles from "./DockZoneOverlay.styles.module.css";

type DockZoneOverlayProps = {
  activeZone: DockState | null;
};

const GHOST_CLASS: Record<DockState, string> = {
  left: position.ghostLeft,
  hybrid: position.ghostHybrid,
  center: position.ghostCenter,
};

const ZONES: DockState[] = ["left", "hybrid", "center"];

// Ghost previews of the 3 dock geometries — exactly where and how big the
// window will land — shown only while dragging the window's header; the
// zone under the cursor highlights more strongly than the other two.
export function DockZoneOverlay({ activeZone }: DockZoneOverlayProps) {
  if (!activeZone) return null;

  return (
    <div className={position.root} data-construction>
      {ZONES.map((zone) => (
        <div
          key={zone}
          className={`${styles.ghost} ${position.ghost} ${GHOST_CLASS[zone]} ${zone === activeZone ? styles.active : ""}`}
          data-construction
        />
      ))}
    </div>
  );
}
