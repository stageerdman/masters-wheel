// Self-serve layout diagnostics for the packaged Tauri app, where there's
// no console to open. Captures real computed layout state (viewport,
// html/body, and the AI assistant's own DOM nodes) and ships it to the
// Rust side (src-tauri/src/assistant.rs's debug_log), which appends it to
// a plain file readable without any devtools/console from whoever's
// testing. This is how the "window renders but isn't visible" bug (a
// stale localStorage drag-position override winning over the CSS dock
// classes) got found — kept here as reusable tooling, not single-use:
// call captureWindowDiagnostics(label) from wherever a future rendering
// bug needs real layout facts instead of another guess, and read
// `$TMPDIR/masters-wheel-debug.log` (not /tmp — macOS sets a per-session
// TMPDIR, find it via `find /var/folders -name masters-wheel-debug.log`).

import { invoke } from "@tauri-apps/api/core";

function rectOf(el: Element | null) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom };
}

function computedOf(el: Element | null, props: string[]) {
  if (!el) return null;
  const style = getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const prop of props) out[prop] = style.getPropertyValue(prop);
  return out;
}

const LAYOUT_PROPS = [
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "width",
  "height",
  "opacity",
  "transform",
  "display",
  "visibility",
  "overflow",
  "z-index",
  "contain",
  "filter",
  "will-change",
];

export function captureWindowDiagnostics(label: string) {
  const html = document.documentElement;
  const body = document.body;
  const assistantRoot = document.getElementById("ai-assistant-root");
  const assistantWindow = document.getElementById("ai-assistant-window");

  const snapshot = {
    label,
    at: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    html: { rect: rectOf(html), computed: computedOf(html, LAYOUT_PROPS) },
    body: { rect: rectOf(body), computed: computedOf(body, LAYOUT_PROPS) },
    assistantRoot: { found: !!assistantRoot, rect: rectOf(assistantRoot), computed: computedOf(assistantRoot, LAYOUT_PROPS) },
    assistantWindow: {
      found: !!assistantWindow,
      className: assistantWindow?.className ?? null,
      rect: rectOf(assistantWindow),
      computed: computedOf(assistantWindow, LAYOUT_PROPS),
    },
  };

  void invoke("debug_log", { message: JSON.stringify(snapshot) }).catch(() => {});
}
