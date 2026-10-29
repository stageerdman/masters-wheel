import { useEffect, useState } from "react";

// Drives the mount-in transition: render first at the "entering" (shrunk,
// transparent) visual state, then flip to "entered" one frame later so the
// CSS transition actually animates instead of snapping straight to open.
export function useWindowEnterTransition() {
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return hasEntered;
}
