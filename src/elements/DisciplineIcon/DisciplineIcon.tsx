import type { ReactNode } from "react";
import type { TrainingToolType } from "@/elements/TrainingRoom/TrainingRoom.data";
import position from "./DisciplineIcon.position.module.css";
import styles from "./DisciplineIcon.styles.module.css";

// One shape function per discipline, parameterized by `paint` (the fill/
// stroke value) rather than hardcoding a color — this is the single
// source of truth for each discipline's artwork. DisciplinePicker's gold-
// foil card crests and this flat, single-color item icon both render the
// exact same geometry, just with a different `paint`, so the two never
// drift apart (see DisciplinePicker.tsx's own symbols).
function wavesShape(paint: string): ReactNode {
  return (
    <>
      <path d="M4 28 Q15 16 26 28 Q36 44 44 50" fill="none" stroke={paint} strokeWidth="3.5" strokeLinecap="round" opacity="0.45" />
      <path d="M4 72 Q15 84 26 72 Q36 56 44 50" fill="none" stroke={paint} strokeWidth="3.5" strokeLinecap="round" opacity="0.45" />
      <path d="M44 50 Q58 24 72 50 Q86 76 96 50" fill="none" stroke={paint} strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function circlesChatShape(paint: string): ReactNode {
  return (
    <>
      <circle cx="50" cy="30" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <circle cx="32" cy="62" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <circle cx="68" cy="62" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <circle cx="44" cy="54" r="2.6" fill={paint} />
      <circle cx="50" cy="54" r="2.6" fill={paint} />
      <circle cx="56" cy="54" r="2.6" fill={paint} />
    </>
  );
}

function circlesVoiceShape(paint: string): ReactNode {
  return (
    <>
      <circle cx="50" cy="30" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <circle cx="32" cy="62" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <circle cx="68" cy="62" r="24" fill="none" stroke={paint} strokeWidth="3.5" />
      <rect x="45" y="50" width="3" height="10" rx="1.5" fill={paint} />
      <rect x="50.5" y="44" width="3" height="16" rx="1.5" fill={paint} />
      <rect x="56" y="50" width="3" height="10" rx="1.5" fill={paint} />
    </>
  );
}

function soulShape(paint: string): ReactNode {
  return (
    <>
      <circle cx="50" cy="34" r="9" fill={paint} />
      <path d="M50 43 C38 50 32 62 32 76 C32 86 40 92 50 92 C60 92 68 86 68 76 C68 62 62 50 50 43 Z" fill={paint} />
      <path d="M30 20 A28 28 0 0 1 70 20" fill="none" stroke={paint} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 12 A38 38 0 0 1 80 12" fill="none" stroke={paint} strokeWidth="3.2" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

function bookShape(paint: string): ReactNode {
  return (
    <>
      <path
        d="M50 30 C38 24 24 22 14 24 V74 C24 72 38 74 50 80 C62 74 76 72 86 74 V24 C76 22 62 24 50 30 Z"
        fill="none"
        stroke={paint}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M50 30 V80" fill="none" stroke={paint} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

// Keyed by discipline rather than by crest id (DisciplinePicker.tsx keeps
// its own CREST_BY_TOOL_TYPE → symbol-id map) so both call sites stay
// typed against TrainingToolType instead of a loose string id.
export const DISCIPLINE_SHAPES: Record<TrainingToolType, (paint: string) => ReactNode> = {
  voiceTraining: wavesShape,
  chatRoleplay: circlesChatShape,
  voiceRoleplay: circlesVoiceShape,
  mindsetShifting: soulShape,
  learning: bookShape,
};

type DisciplineIconProps = {
  toolType: TrainingToolType;
};

// The flat, single-color item icon — same artwork as DisciplinePicker's
// gold-foil crest (see DISCIPLINE_SHAPES above), painted with `currentColor`
// so it picks up whatever color/font-size the parent's icon wrapper sets
// (SessionListItem, TagChip — same `--icon-color` + font-size convention
// VideoListItem established; see CLAUDE.md's styling standards).
export function DisciplineIcon({ toolType }: DisciplineIconProps) {
  return (
    <svg className={`${styles.root} ${position.root}`} viewBox="0 0 100 100" aria-hidden="true" data-construction>
      {DISCIPLINE_SHAPES[toolType]("currentColor")}
    </svg>
  );
}
