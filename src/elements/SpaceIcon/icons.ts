// The curated icon set a Space can be identified by — sourced from
// Phosphor Icons (MIT), "duotone" weight for a detailed-but-minimal look
// rather than flat/line icons. Deliberately a small fixed set (not every
// Phosphor icon) so the picker stays a short, scannable grid, not an
// overwhelming search box — matches this project's "cut everything
// unnecessary" UX rule.

import {
  Anchor,
  Barbell,
  BookOpen,
  Brain,
  Camera,
  ChartBar,
  Code,
  Compass,
  Crown,
  Cube,
  Diamond,
  Feather,
  Fire,
  Flask,
  Gear,
  Globe,
  Heart,
  Leaf,
  Lightbulb,
  Lightning,
  Mountains,
  MusicNotes,
  PaintBrush,
  Rocket,
  Scales,
  ShieldCheck,
  Star,
  Sword,
  Target,
  Trophy,
  Users,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";

export const SPACE_ICON_IDS = [
  "compass",
  "fire",
  "book",
  "anchor",
  "mountains",
  "leaf",
  "lightning",
  "shield",
  "diamond",
  "wrench",
  "palette",
  "rocket",
  "chart",
  "barbell",
  "code",
  "crown",
  "camera",
  "globe",
  "music",
  "flask",
  "brain",
  "lightbulb",
  "gear",
  "sword",
  "feather",
  "target",
  "trophy",
  "heart",
  "star",
  "scales",
  "cube",
  "users",
] as const;

export type SpaceIconId = (typeof SPACE_ICON_IDS)[number];

export const DEFAULT_SPACE_ICON_ID: SpaceIconId = "compass";

const ICON_COMPONENTS: Record<SpaceIconId, Icon> = {
  compass: Compass,
  fire: Fire,
  book: BookOpen,
  anchor: Anchor,
  mountains: Mountains,
  leaf: Leaf,
  lightning: Lightning,
  shield: ShieldCheck,
  diamond: Diamond,
  wrench: Wrench,
  palette: PaintBrush,
  rocket: Rocket,
  chart: ChartBar,
  barbell: Barbell,
  code: Code,
  crown: Crown,
  camera: Camera,
  globe: Globe,
  music: MusicNotes,
  flask: Flask,
  brain: Brain,
  lightbulb: Lightbulb,
  gear: Gear,
  sword: Sword,
  feather: Feather,
  target: Target,
  trophy: Trophy,
  heart: Heart,
  star: Star,
  scales: Scales,
  cube: Cube,
  users: Users,
};

// An unrecognized or empty id (a hand-edited registry, or the Default
// Space's migrated-in icon — see src-tauri/src/spaces.rs) falls back to
// the default rather than rendering nothing, same tolerance every other
// parser in this app gives missing/corrupt data.
export function resolveSpaceIcon(icon: string): Icon {
  const id = (SPACE_ICON_IDS as readonly string[]).includes(icon) ? (icon as SpaceIconId) : DEFAULT_SPACE_ICON_ID;
  return ICON_COMPONENTS[id];
}
