export const HOME_ROUTE = "/";

// Main Menu is the minimal front door — no chrome above it.
const HEADER_HIDDEN_ROUTES = [HOME_ROUTE];

export function isHeaderHidden(pathname: string): boolean {
  return HEADER_HIDDEN_ROUTES.includes(pathname);
}

export type Navigate = (href: string) => void;

// A full page load, not Next's client router: in the packaged app (static
// export on tauri://) router.push("/") fetches /index.txt?_rsc=… and that
// request never resolves, so the transition never commits and the user stays
// on Performance Review. Loading index.html directly always lands home.
export const hardNavigate: Navigate = (href) => window.location.assign(href);

export function goHome(navigate: Navigate = hardNavigate): void {
  navigate(HOME_ROUTE);
}
