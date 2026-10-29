# AI Assistant — wiki

Durable decisions and lessons from designing the AI assistant (icon →
pop-up chat window with 3 docked forms). Synthesized from 3 parallel
UX-research passes (icon/motion, drag-to-dock geometry, chat/history/
agent content) plus the orchestrator's resolution of each pass's open
questions.

## What the old bottom-left "N" actually was
Not custom code — it's Next.js's built-in dev-mode indicator badge,
controlled by `devIndicators` in `next.config.ts`. Turning it off there
(`devIndicators: false`) is the correct way to "drop whatever was there
before"; there was no element to delete.

## Why snap-to-3-states, not freeform dragging
The user's own framing ("several forms and positions it can take")
describes a finite state machine, not continuous placement. Freeform
would need persisted arbitrary coordinates and resize/collision handling
for no payoff — the content inside only has 3 valid shapes (single chat /
roomier single chat / chat+sidebar) regardless of exact pixel position.
The window still follows the cursor during the drag for feedback, but
always resolves to one of left/center/hybrid on release.

## Why no new color tokens for this feature
- Trigger icon + drop-zone affordance reuse `--color-accent` (at reduced
  opacity for the drop-zone band via an inline-style mix, same pattern as
  `--badge-color`/`--icon-color` instancing elsewhere in the app) — this is
  chrome, not a new category identity, so it belongs in the existing core-5
  budget.
- Agent avatars start **neutral** (a shared bordered circle + initial, no
  per-agent color) rather than a new `--color-agent-*` category palette.
  Reasoning: the bookmark/status category colors exist because each value
  *is* a real, dictated, distinct category. Agents here are still a mockup
  with no confirmed roster or identity system — adding colors now would be
  deciding a category ad hoc. Revisit this the moment real, named agents
  with real distinct identities get dictated as a feature.

## Drag handle = the window's header
The header bar is the only region guaranteed to exist across all 3 states
(chat content changes, header doesn't), and it already needs to host the
collapse (h-line) button — so header-as-drag-handle reuses one surface for
both jobs instead of adding a dedicated grip element.

## Styles/position split for `density`
`density: "compact" | "comfortable"` threads down from the dock controller
into `MessageList`/`Composer` as a prop, and only ever toggles
`.position.module.css` classes (padding/spacing/line-length) — never
`.styles.module.css` classes (color/type). This keeps the convention's
styles-vs-position boundary intact even though the same prop affects both
"look and feel" conversationally.

## Explicit `density` prop over ResizeObserver/container queries
Matches CLAUDE.md's rule that a parent is responsible for its children's
positioning — the dock controller already knows which of the 3 states is
active, so it should just tell its children, rather than have each child
independently re-derive the same fact from its own measured width.

## Drag-to-dock implementation notes
- The window is positioned absolutely within a full-viewport fixed
  `AIAssistant` root (`position: fixed; inset: 0; pointer-events: none;`);
  the trigger, window, and drop-zone bands each opt back into
  `pointer-events: auto` individually so the rest of the page stays
  clickable everywhere else.
- Every dock geometry (`enter`/`dockLeft`/`dockCenter`/`dockHybrid`) sets
  `left`/`top`/`width`/`height`/`transform` explicitly — never `bottom`,
  never an implicit value — specifically so every transition between them
  has a concrete start and end to animate across (mixing `bottom` with
  `top`, or leaving a property unset in some states, made Chrome snap
  instead of animate on dock changes).
- `transform` on each dock class composes a fixed centering offset with a
  live `translate(var(--drag-x, 0px), var(--drag-y, 0px))` — set only via
  inline style while dragging — so cursor-follow never has to fight the
  dock class for the whole `transform` property. No ref/`getBoundingClientRect`
  needed for this: the drag offset is just `pointer - pointerdownStart`.
- Because `transition` is a single shorthand per selector, exactly one
  file may declare it for a given selector or the other's properties get
  silently dropped. `AIAssistantWindow.position.module.css` owns the
  entire `transition` declaration (including `opacity`, even though
  opacity's *values* live in `.styles.module.css`) — this is the pattern
  to repeat if a future element needs to transition properties split
  across both files.
- Drag is disabled below 640px viewport width (`DRAG_DISABLED_BELOW_PX` in
  `AIAssistant.script.ts`); below that breakpoint the left dock becomes
  near-full-bleed via a plain CSS media query in the same position module.

## Deliberately deferred (not blocking v1)
- `dockState` persistence across reloads (currently always resets).
- Keyboard-only path to cycle dock states (accessibility gap, needs an
  owner once the pointer-drag version is stable).
- Whether a dropped-in agent should ever produce fake reply text — no,
  for now; there's no multi-agent logic to simulate convincingly yet, so a
  system line + chip is the honest amount of fakery for UI-shell phase.
