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

// One riveted portrait frame in DisciplinePicker's row. Four states live
// here: locked (inert, unlit torch, dead wick), available-idle (lit torch,
// resting glow), hovered/focused (CSS :hover and :focus-visible — brighter,
// lifts), and confirming (the brief "ignite" flash after a real click,
// driven by DisciplinePicker.script.ts's confirmingToolType, right before
// the session actually gets created). `accentColor` is this discipline's
// own subtle tint — blended into the shared --discipline-* ironwork chrome
// via color-mix in the stylesheet, never used on its own.
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
              // under the ignite animation (see DisciplinePicker.tsx).
              event.stopPropagation();
              onSelect();
            }
      }
    >
      <span className={`${styles.torch} ${position.torch}`} data-construction aria-hidden="true" />
      <span className={`${styles.bezel} ${position.bezel}`} data-construction>
        <span className={`${styles.corner} ${position.cornerNw}`} data-construction aria-hidden="true" />
        <span className={`${styles.corner} ${position.cornerSe}`} data-construction aria-hidden="true" />
        <span className={`${styles.portrait} ${position.portrait}`} data-construction>
          <svg className={`${styles.crest} ${position.crest}`} data-construction aria-hidden="true">
            <use href={crestHref} />
          </svg>
        </span>
      </span>
      <span className={`${styles.plaque} ${position.plaque}`} data-construction>
        <span className={`${styles.plaqueLabel} ${position.plaqueLabel}`} data-construction>
          {label}
        </span>
        <span className={`${styles.plaqueState} ${position.plaqueState}`} data-construction>
          {isConfirming ? "Igniting…" : locked ? "Not Yet Forged" : "Ready to Begin"}
        </span>
      </span>
    </button>
  );
}
