# AI Assistant — v1

## Goal
Replace the Next.js dev-mode indicator badge (bottom-left "N") with a
global AI assistant that lives above every environment: an idle animated
icon that expands into a pop-up chat window. The window has 3 docked
forms — left (default, small), center (larger, comfortable), hybrid
(center chat + left sidebar with history and selectable/draggable
agents) — reached by dragging, and collapses back to the icon via a
small button in its header. UI-shell only: fake data, no real AI calls.

## Status
OPEN — Phase 0 not started.

## Element plan
```
src/elements/AIAssistant/                     (global, mounted in layout.tsx)
  AIAssistant.tsx
  AIAssistant.styles.module.css
  AIAssistant.position.module.css
  AIAssistant.script.ts        — useAIAssistant: isOpen, dockState, drag
  children/
    AIAssistantTrigger/        — idle concentric-circles icon/button
    AIAssistantWindow/         — header (collapse + drag handle) + content slot
      AIAssistantWindow.data.ts — fake ChatMessage/ChatSession/Agent fixtures
      children/
        MessageList/
          children/Message/
        Composer/
        HistoryList/
          children/HistoryListItem/
        AgentRoster/
          children/AgentRosterItem/
        ActiveAgentChip/
```

## Phased roadmap

### Phase 0 — Groundwork
- Disable the Next.js dev indicator (`devIndicators: false` in `next.config.ts`).
- Scaffold `AIAssistant` + `AIAssistantTrigger`: fixed bottom-left, highest
  z-index in the app, 3 rotating open-arc rings (`currentColor` /
  `--color-accent`, no new token), `prefers-reduced-motion` → static rings.
- Verify: icon renders identically on every route, old badge is gone,
  `npm run build` + `tsc --noEmit` clean.

### Phase 1 — Open/collapse shell
- Build `AIAssistantWindow` shell: header with h-line collapse button +
  drag-handle region, empty content area. Expand choreography anchored
  bottom-left (scale+opacity, ~250ms ease-out); collapse reverses it
  (~15% faster). Default landing geometry = left-docked only (no drag yet).
- Verify: press icon → window opens at left dock; press collapse → returns
  to icon; reduced-motion gets an opacity-only crossfade.

### Phase 2 — Chat content (left-docked only)
- Build `MessageList`/`Message` (assistant flush-left, user right-aligned
  tinted via `color-mix(--color-accent)`), `Composer` (auto-growing
  textarea + send button), empty "Ask anything." state.
- Sending appends the user's message locally; no fake AI reply yet (no AI
  integration exists in this project per CLAUDE.md's "not built yet" list).
- Verify: type, send, message appears; `density="compact"` spacing.

### Phase 3 — Drag-to-dock (left / center / hybrid)
- `useAIAssistant` grows a `dockState: "left" | "center" | "hybrid"` +
  transient drag position. Drag from the header; 3 viewport-relative zones
  (~0–30% / 30–60% / 60%+) with a faint `--color-accent`-tinted drop-zone
  band while dragging; snaps to nearest state on release (never rests
  freeform). Geometry grows left → center → hybrid; `density` prop
  ("compact" vs "comfortable") threads down to chat content.
- Hybrid state reserves the sidebar slot (empty placeholder) — content is
  Phase 4.
- Below a narrow-viewport breakpoint, disable docking entirely (left-only,
  near-full-bleed when open).
- Verify: drag through all 3 zones, confirm snap + resize animation,
  confirm reduced-motion/mobile fallbacks.

### Phase 4 — History + agent roster (hybrid sidebar)
- `HistoryList`/`HistoryListItem` (fake `ChatSession[]`, selecting swaps
  the active session) and `AgentRoster`/`AgentRosterItem` (fake `Agent[]`,
  neutral shared avatar circle + initial — no new per-agent color token
  yet, see wiki.md) stacked in the sidebar.
- Click or drag an agent card onto the chat area → `ActiveAgentChip` near
  the composer + a muted centered system line in the message list. No
  fake agent reply text.
- Update `FEATURES.md` (Main Menu / global section) once this phase lands.
- Verify: switch sessions, add/remove an agent chip, drag affordance
  highlights the chat area via `box-shadow` (never `outline`).

## Decided
See `wiki.md` for the full reasoning behind each call below.
- Snap-to-3-states on drag release, not freeform placement.
- `--color-accent` for the trigger glyph and drop-zone affordance — no new
  core color.
- Agent avatars start neutral (no new category-color tokens); revisit if
  real distinct agents are ever dictated.
- `dockState`/open state does not persist across reloads — always resets
  to closed + left-docked.
- History/Agents render as two stacked sidebar sections, not tabs.

## Next
Awaiting go-ahead to start Phase 0.
