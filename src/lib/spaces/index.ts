// Public entry point for this module — every other part of the app
// imports Space types/behavior from here, never from the individual files
// directly.
//   types.ts            - what a Space/SpaceRegistry looks like
//   paths.ts             - where every per-Space folder lives on disk
//   activeSpaceStore.ts  - the active Space, readable outside React
//   registry.ts          - reading/writing spaces.json, create/delete/switch
//   context.tsx           - SpacesProvider, mounted once in layout.tsx

export * from "./types";
export { STORAGE_DIR_NAME, spaceAgentsDir, spaceChatsDir, spaceDir, spaceRecordsDir } from "./paths";
export { getActiveSpaceFolder, useActiveSpace } from "./activeSpaceStore";
export { SpacesProvider, useSpaces } from "./context";
