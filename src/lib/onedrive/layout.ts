// Where things live inside the app's OneDrive folder (OneDrive/Apps/<app
// name>/), plus its manifest.json. Pure: no Tauri, so it's unit-tested.
//
//   manifest.json
//   <Space folder>/<Section>/<YYYY-MM>/<video files>
//
// Connecting creates the Space and Section folders. Month folders appear
// when the first video for that month uploads.

export const MANIFEST_PATH = "manifest.json";
export const MANIFEST_SCHEMA_VERSION = 1;
export const LAYOUT_DESCRIPTION = "<Space>/<Section>/<YYYY-MM>/";

// Everything in the app that holds video or audio worth storing.
export const CLOUD_SECTIONS = ["Performance Reviews", "Voice Training", "Frame Drills"] as const;
export type CloudSection = (typeof CLOUD_SECTIONS)[number];

export type ManifestSpace = { id: string; name: string; folder: string };

export type CloudManifest = {
  app: "Master's Wheel";
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  layout: string;
  sections: string[];
  // Every Space that has ever had a folder here, so another Mac (or a
  // later Space rename) can map a Space id to its cloud folder.
  spaces: ManifestSpace[];
};

type SpaceLike = { id: string; name: string; folderName: string };

// OneDrive rejects " * : < > ? / \ | in names, and leading/trailing spaces
// or a trailing dot.
export function cloudSegment(name: string): string {
  const cleaned = name
    .replace(/["*:<>?/\\|]/g, "-")
    .trim()
    .replace(/\.+$/, "");
  return cleaned || "Untitled";
}

export function spaceFolder(space: SpaceLike): string {
  return cloudSegment(space.folderName);
}

export function sectionFolder(space: SpaceLike, section: CloudSection): string {
  return `${spaceFolder(space)}/${section}`;
}

// Month folder from the local calendar date (what the user sees in the app).
export function monthFolder(space: SpaceLike, section: CloudSection, date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${sectionFolder(space, section)}/${date.getFullYear()}-${month}`;
}

export function skeletonFolders(spaces: SpaceLike[]): string[] {
  return spaces.flatMap((space) => CLOUD_SECTIONS.map((section) => sectionFolder(space, section)));
}

export function buildManifest(previous: CloudManifest | null, spaces: SpaceLike[], now: string): CloudManifest {
  const byId = new Map((previous?.spaces ?? []).map((space) => [space.id, space]));
  for (const space of spaces) byId.set(space.id, { id: space.id, name: space.name, folder: spaceFolder(space) });
  return {
    app: "Master's Wheel",
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    layout: LAYOUT_DESCRIPTION,
    sections: [...CLOUD_SECTIONS],
    spaces: [...byId.values()],
  };
}

// Tolerant like every other parse in the app: junk or a missing file is
// `null` (start fresh), bad Space entries are dropped.
export function parseManifest(text: string | null): CloudManifest | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<CloudManifest>;
  const spaces = Array.isArray(candidate.spaces)
    ? candidate.spaces.filter(
        (s): s is ManifestSpace =>
          !!s && typeof s.id === "string" && typeof s.name === "string" && typeof s.folder === "string"
      )
    : [];
  return {
    app: "Master's Wheel",
    schemaVersion: typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : MANIFEST_SCHEMA_VERSION,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    layout: LAYOUT_DESCRIPTION,
    sections: [...CLOUD_SECTIONS],
    spaces,
  };
}
