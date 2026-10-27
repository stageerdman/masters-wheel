# Wiki — INIT adoption

Durable decisions and lessons from standing up masters-wheel.

## The element convention
- An **element** is a self-contained folder: `Name.tsx` (component),
  `Name.styles.module.css` (look), `Name.position.module.css` (placement
  within the parent), optional `Name.script.ts` (non-trivial client logic),
  optional `children/` (sub-elements only that specific parent uses).
- **Styling vs. positioning is a real separation, not just two files for the
  sake of it:** styling is intrinsic to the element (how it looks wherever it
  goes); positioning is relational (how it sits in *this* parent). This means
  the same element can be repositioned for a new parent without touching how
  it looks, and restyled without touching layout.
- **Reusable elements live flat under `src/elements/`** and get imported
  wherever needed. `children/` is only for elements that are genuinely local
  to one parent and would never be reused — it exists so a parent's folder
  stays self-contained, not as a place to stash things that should be shared.
- **A "standard" for a repeated element (e.g. side-menu buttons) is typed
  props**, not per-instance style overrides. Define the shape once on the
  element; every call site just passes data.
- `src/elements/Canvas/` is the reference implementation of this convention —
  copy its shape for the next element rather than re-deriving it.

## Stack decision
- Next.js (App Router) + TypeScript + CSS Modules, no Tailwind/shadcn.
- Rejected Tailwind/shadcn (UX.md's usual default) because the user's element
  convention already is the design system — utility classes or a component
  library would fight the per-element styling/positioning file split instead
  of reinforcing it.
- Rejected a native/Tauri app: this is an upload-and-review platform meant to
  run in a browser, not a local desktop tool.
- `next.config.ts` sets `agentRules: false` — Next.js 16 auto-generates an
  `AGENTS.md` on dev/build by default, which collides with this project using
  `CLAUDE.md` as the single source of agent instructions. Turn it off once,
  at scaffold time, rather than deleting the file repeatedly.

## Scope discipline
- This INIT deliberately builds zero real UI — no lesson/video/performance
  elements. The user wants to dictate those one at a time. Building ahead of
  that would violate CODING.md's "build only what's truly needed."
- Same logic for secrets: `.env` stays empty and `.project`'s `secrets: []`
  until a phase actually introduces a backend, auth, storage, or AI call that
  needs one. Don't provision secrets speculatively.
