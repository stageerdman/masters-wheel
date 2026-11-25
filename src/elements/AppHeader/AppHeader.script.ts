export const HOME_ROUTE = "/";

// Main Menu is the minimal front door — no chrome above it.
const HEADER_HIDDEN_ROUTES = [HOME_ROUTE];

export function isHeaderHidden(pathname: string): boolean {
  return HEADER_HIDDEN_ROUTES.includes(pathname);
}

type Router = { push(href: string): void };

// Goes through router.push, the same path Main Menu uses. A <Link> here
// prefetches with a HEAD request plus a segment-tree fetch, and in the
// packaged Tauri app (static export on tauri://) that click went nowhere.
export function goHome(router: Router): void {
  router.push(HOME_ROUTE);
}
