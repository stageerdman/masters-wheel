// What one Space is. The folder name is split from `name` deliberately —
// `name` is what the user typed and can look however they like, while
// `folderName` is the sanitized, filesystem-safe version that's actually
// used on disk (see registry.ts). Renaming a Space later would need its
// folder renamed too; not built yet since rename isn't a requested feature.
export type Space = {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  folderName: string;
};

export type SpaceRegistry = {
  spaces: Space[];
  activeSpaceId: string;
};
