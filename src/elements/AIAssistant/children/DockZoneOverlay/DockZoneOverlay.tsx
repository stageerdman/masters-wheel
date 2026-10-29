import type { DockState, PresetOverrides } from "@/elements/AIAssistant/AIAssistant.windowDock.script";
import position from "./DockZoneOverlay.position.module.css";
import styles from "./DockZoneOverlay.styles.module.css";

type DockZoneOverlayProps = {
  activeZone: DockState | null;
  presetOverrides: PresetOverrides;
};

const GHOST_CLASS: Record<DockState, string> = {
  left: position.ghostLeft,
  center: position.ghostCenter,
};

const ZONES: DockState[] = ["left", "center"];

// Ghost previews of the 2 dock geometries — exactly where and how big the
// window will land — shown only while dragging the window's header; the
// zone under the cursor highlights more strongly than the other one. Any
// zone that's been Option-redefined previews its saved override instead
// of the built-in default, since that's where it will actually land.
export function DockZoneOverlay({ activeZone, presetOverrides }: DockZoneOverlayProps) {
  if (!activeZone) return null;

  return (
    <div className={position.root} data-construction>
      {ZONES.map((zone) => {
        const override = presetOverrides[zone];
        // Same fix as AIAssistantWindow: ghostCenter also centers itself
        // via transform: translate(-50%, 0), which must not stack on top
        // of an already-absolute override left — otherwise the preview
        // drifts left of where the window will actually land.
        const style: React.CSSProperties | undefined = override
          ? {
              left: `${override.left}px`,
              top: `${override.top}px`,
              width: `${override.width}px`,
              height: `${override.height}px`,
              transform: "translate(0, 0)",
            }
          : undefined;
        return (
          <div
            key={zone}
            className={`${styles.ghost} ${position.ghost} ${GHOST_CLASS[zone]} ${zone === activeZone ? styles.active : ""}`}
            style={style}
            data-construction
          />
        );
      })}
    </div>
  );
}
