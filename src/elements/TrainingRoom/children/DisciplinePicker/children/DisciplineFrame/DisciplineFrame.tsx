import position from "./DisciplineFrame.position.module.css";
import styles from "./DisciplineFrame.styles.module.css";

type DisciplineFrameProps = {
  label: string;
  description: string;
  locked: boolean;
  accentColor: string;
  crestHref: string;
  isConfirming: boolean;
  onSelect: () => void;
};

// A full gold-and-parchment card face — corner scrollwork, a double cream
// frame-line, and scattered sparkles — reused for both the front and the
// back so each side of the flip is a complete card, not a bare content
// pane sitting inside a frame that stayed put.
function CardFace({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${styles.goldFrame} ${position.goldFrame}`} data-construction>
      <span className={`${styles.panel} ${position.panel}`} data-construction>
        <span className={`${styles.frameLineOuter} ${position.frameLineOuter}`} data-construction aria-hidden="true" />
        <span className={`${styles.frameLineInner} ${position.frameLineInner}`} data-construction aria-hidden="true" />
        <svg className={`${styles.corner} ${position.cornerTl}`} data-construction aria-hidden="true">
          <use href="#discipline-i-scroll" />
        </svg>
        <svg className={`${styles.corner} ${position.cornerTr}`} data-construction aria-hidden="true">
          <use href="#discipline-i-scroll" />
        </svg>
        <svg className={`${styles.corner} ${position.cornerBl}`} data-construction aria-hidden="true">
          <use href="#discipline-i-scroll" />
        </svg>
        <svg className={`${styles.corner} ${position.cornerBr}`} data-construction aria-hidden="true">
          <use href="#discipline-i-scroll" />
        </svg>
        <svg className={`${styles.sparkle} ${position.sparkle1}`} data-construction aria-hidden="true">
          <use href="#discipline-i-sparkle" />
        </svg>
        <svg className={`${styles.sparkle} ${position.sparkle2}`} data-construction aria-hidden="true">
          <use href="#discipline-i-sparkle" />
        </svg>
        <svg className={`${styles.sparkle} ${position.sparkle3}`} data-construction aria-hidden="true">
          <use href="#discipline-i-sparkle" />
        </svg>
        {children}
      </span>
    </span>
  );
}

// One gilded trading card. The whole card turns in 3D on hover/focus, not
// just a window inside a static frame — .flipInner holds two full
// CardFaces (front/back) rotated 180° apart, so hovering genuinely spins
// the object around (see the .position/.styles split below for exactly
// which half is "always true regardless of state" vs "a hover/locked/
// confirming reaction").
//
// Four states: locked (inert, desaturated, no hover-lift, but still
// flips so you can read what's coming), available-idle, hovered/focused
// (CSS :hover/:focus-visible triggers the flip), and confirming (the
// brief gold flash + checkmark badge right before the session is created,
// driven by DisciplinePicker.script.ts's confirmingToolType). The lock/
// confirm badges live outside .flipInner so they stay facing you through
// the turn instead of rotating away with the card.
export function DisciplineFrame({
  label,
  description,
  locked,
  accentColor,
  crestHref,
  isConfirming,
  onSelect,
}: DisciplineFrameProps) {
  return (
    <button
      type="button"
      className={`${styles.root} ${position.root} ${locked ? styles.locked : styles.available} ${
        isConfirming ? styles.confirming : ""
      }`}
      data-construction
      style={{ "--discipline-accent": accentColor } as React.CSSProperties}
      disabled={locked}
      aria-disabled={locked}
      title={description}
      onClick={
        locked
          ? undefined
          : (event) => {
              // Stops here so a real selection doesn't also bubble up as a
              // "blank space" click and close DisciplinePicker out from
              // under the confirm flash (see DisciplinePicker.tsx).
              event.stopPropagation();
              onSelect();
            }
      }
    >
      <svg className={`${styles.lockBadge} ${position.lockBadge}`} data-construction aria-hidden="true">
        <use href="#discipline-i-lock" />
      </svg>
      <svg className={`${styles.confirmBadge} ${position.confirmBadge}`} data-construction aria-hidden="true">
        <use href="#discipline-i-check" />
      </svg>
      <span className={`${styles.flipInner} ${position.flipInner}`} data-construction>
        <span className={`${position.face}`} data-construction>
          <CardFace>
            <span className={`${position.contentFront}`} data-construction>
              <span className={`${styles.iconRing} ${position.iconRing}`} data-construction>
                <svg className={`${styles.icon} ${position.icon}`} data-construction aria-hidden="true">
                  <use href={crestHref} />
                </svg>
              </span>
              <span className={`${styles.namePill} ${position.namePill}`} data-construction>
                <span className={`${styles.titleText} ${position.titleText}`} data-construction>
                  {label}
                </span>
              </span>
            </span>
          </CardFace>
        </span>
        <span className={`${position.face} ${position.faceBack}`} data-construction>
          <CardFace>
            <span className={`${position.contentBack}`} data-construction>
              <span className={`${styles.backPlaque} ${position.backPlaque}`} data-construction>
                <span className={`${styles.backTitle} ${position.backTitle}`} data-construction>
                  {label}
                </span>
                <span className={`${styles.backRule} ${position.backRule}`} data-construction />
                <span className={`${styles.backDesc} ${position.backDesc}`} data-construction>
                  {description}
                </span>
                <span className={`${styles.backStatus} ${position.backStatus}`} data-construction>
                  {isConfirming ? "Igniting…" : locked ? "Not yet available" : "Ready to begin"}
                </span>
              </span>
            </span>
          </CardFace>
        </span>
      </span>
    </button>
  );
}
