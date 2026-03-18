# Team Foundry v2 — Pixel Office UI Redesign

## Summary

Complete visual overhaul of Team Foundry from a dark, geek-oriented PixiJS renderer to a warm, welcoming pixel-art office in GBA 3/4 view style, rendered with pure HTML/CSS. The backend (event sourcing, projector, scheduler, provider adapters, DB) remains intact. The UI gets a new layout, new theme, new renderer, and new component structure.

## Goals

- Replace PixiJS with lightweight HTML/CSS sprite rendering
- Achieve a GBA / RPG Maker 3/4 perspective pixel office
- Warm, inviting American-style office aesthetic (light wood, plants, warm light)
- Clean, simple UI with cream/warm color palette
- Layout in L-shape: pixel office top, outputs bottom, sidebar right
- Onboarding as empty office with centered composer overlay
- Keep all backend logic untouched

## Non-Goals (v1)

- Real-time chat with agents (v2)
- Click-on-agent micro-management (v3)
- Complete sprite animations (idle breathing, typing, etc.)
- Custom office layout editor
- Multi-team / multi-workspace
- Browser automation tools for agents

---

## Architecture

### Component Structure

```
src/
├── components/
│   ├── office/
│   │   ├── office-view.tsx          # CSS Grid office, tile background, furniture placement
│   │   ├── agent-sprite.tsx         # Agent: sprite img + state bubble + name label
│   │   ├── furniture.tsx            # Static furniture pieces (desk, chair, plant, coffee)
│   │   └── meeting-bubble.tsx       # Visual grouping when agents meet
│   ├── outputs/
│   │   ├── artifact-panel.tsx       # Horizontal card strip below office
│   │   └── artifact-card.tsx        # Single artifact: title, status badge, version, preview
│   ├── sidebar/
│   │   ├── approval-sidebar.tsx     # Right sidebar: stacked approval gates
│   │   ├── approval-gate-card.tsx   # Single gate: pending/approved with action buttons
│   │   └── command-input.tsx        # Disabled v1 input, ready for v2 chat
│   ├── composer/
│   │   └── mission-composer.tsx     # Overlay form on empty office
│   └── workspace-shell.tsx          # L-shaped layout orchestrator
├── lib/
│   ├── state/
│   │   └── office-layout.ts         # Pure function: agent state → grid position
│   └── ... (runtime/, db/ unchanged)
└── assets/
    └── sprites/                     # LPC spritesheets and tile PNGs
```

### Unchanged Backend

These files remain as-is:

- `src/lib/runtime/engine.ts` — workspace lifecycle orchestration
- `src/lib/runtime/projector.ts` — event-to-state projection
- `src/lib/runtime/scheduler.ts` — execution timeline and event emission
- `src/lib/runtime/adapters/providers.ts` — LLM adapters (Mock/OpenAI/Claude/Gemini/Ollama)
- `src/lib/runtime/adapters/tools.ts` — tool adapters (file read, web search)
- `src/lib/db/schema.ts` + `client.ts` — SQLite + Drizzle persistence
- `src/lib/types.ts` — all domain types
- `src/lib/config.ts` — app paths
- `src/lib/role-templates.ts` — agent role templates
- `src/app/api/**` — all API routes (workspaces, approve, stream)

---

## Pixel Office Renderer

### Grid System

- 22 columns x 14 rows, each cell 32x32px → 704x448px total
- Rendered as a CSS Grid container with `position: relative`
- Background: repeating 32x32 parquet tile image
- Furniture and agents positioned with `grid-column` / `grid-row` or absolute positioning within the grid

### Office Layout (3/4 View)

```
Row 1-2:   Back wall — beige/cream, windows with warm light, clock, motivational poster
Row 3-8:   Workspace zone — individual desks with monitors, chairs, personal items
           Desk 1 (col 2-4)    Desk 2 (col 7-9)    Desk 3 (col 12-14)   Coffee machine (col 19-20)
           Desk 4 (col 2-4)    Desk 5 (col 7-9)    Plants (col 15)      Task board (col 18)
Row 9-13:  Meeting zone — conference table with chairs, whiteboard
           Meeting table (col 6-12, row 10-12)
Row 14:    Bottom wall accent
```

### Agent Placement Logic

`office-layout.ts` exposes a pure function:

```typescript
type GridPosition = { row: number; col: number; zone: 'desk' | 'meeting' | 'coffee' }

function agentGridPosition(agentId: string, agentState: AgentVisualState): GridPosition
```

State-to-position mapping:
- `idle` → assigned desk
- `writing` → assigned desk
- `researching` → assigned desk (with search bubble)
- `meeting` → meeting room (chairs around table)
- `waiting_for_approval` → assigned desk (with clock bubble)
- `done` → assigned desk (with checkmark bubble)

Each agent has a fixed desk assignment (agent index → desk slot). Only meetings cause physical movement.

### Agent Sprite Component

Each agent is a `<div>` containing:
- `<img>` — LPC spritesheet frame (64x64), oriented based on last movement direction
- State bubble `<div>` — floating above the sprite, contains icon (magnifying glass, clock, checkmark, zzz)
- Name `<span>` — below the sprite, small text

### Movement Animation

When agent state changes and requires physical movement (e.g., desk → meeting room):
1. Update `top`/`left` (or `transform: translate`) with `transition: all 0.8s ease-in-out`
2. During transition, cycle through 2-3 walk frames via `setInterval` (~150ms per frame)
3. On arrival, switch back to static sitting/standing sprite

No complex pathfinding — agents move in a straight line between origin and destination. The grid is small enough that this reads well visually.

---

## Layout (L-Shape)

### Workspace Shell Structure

```
┌─────────────────────────────────┬────────────┐
│                                 │            │
│   PIXEL OFFICE (office-view)    │  SIDEBAR   │
│   ~70% width, ~65% height      │  ~250px    │
│   Fixed aspect ratio 704x448   │  fixed     │
│                                 │            │
├─────────────────────────────────┤  Approval  │
│                                 │  gates     │
│   OUTPUTS (artifact-panel)      │            │
│   ~35% height, scrollable      │  ────────  │
│   Horizontal card layout        │            │
│                                 │  Commands  │
│                                 │  (v2)      │
└─────────────────────────────────┴────────────┘
```

The shell uses CSS Grid:
```css
.workspace-shell {
  display: grid;
  grid-template-columns: 1fr 250px;
  grid-template-rows: auto 1fr;
  height: 100vh;
}
```

### Responsive Behavior

- Desktop (>1024px): full L-shape layout as described
- Tablet (768-1024px): sidebar collapses to bottom, below outputs
- Mobile (<768px): stacked — office, then sidebar, then outputs (simplified view)

---

## Theme & Visual Design

### Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Background | `#faf8f5` | Main app background, panels |
| Surface | `#ffffff` | Cards, inputs |
| Border | `#e8e2d8` | Card borders, dividers |
| Text primary | `#3a3630` | Headings, body text |
| Text secondary | `#8a7a6a` | Labels, metadata |
| Text muted | `#b8a898` | Placeholders, disabled |
| Success | `#5a8a6a` | Approved gates, done status |
| Pending | `#c49a3c` | Waiting gates, draft status |
| Attention | `#c47a5a` | Needs review, warnings |
| Office bg | `#2a2a3e` | Pixel office dark surround (optional, or use wall color) |

### Typography

- Headings: Bricolage Grotesque (already in project)
- Body/UI: Bricolage Grotesque
- Code/mono: IBM Plex Mono (already in project)
- Base size: 14px, scale: 1.2 ratio

### Styling Rules

- Border radius: 12px everywhere (cards, buttons, inputs, panels)
- Shadows: `box-shadow: 0 1px 3px rgba(0,0,0,0.06)` — barely visible, just depth
- No harsh borders — use subtle `#e8e2d8` when separation is needed
- Status badges: small rounded pills with soft background color + text
- Buttons: solid fill for primary (success green), ghost/outline for secondary
- Transitions: 200ms ease for hover/focus states

---

## Onboarding Flow

### Initial State

User lands on the app → sees an empty pixel office. Chairs empty, screens off, plants present, coffee machine idle. Warm and inviting but clearly waiting for people.

Centered over the office: a semi-transparent overlay with the mission composer form.

### Mission Composer (Overlay)

Three fields only:
1. **Mission** (textarea) — "Décrivez votre mission en langage naturel"
2. **Outputs attendus** (input) — "ex: rapport de veille, plan d'action, analyse concurrentielle"
3. **Drop zone** — drag & drop area for files (PDF, docs, markdown)

Below: provider selector (dropdown, defaulting to Mock) and submit button "Proposer une équipe →"

A small "Essayer avec un exemple" link below the button for the demo preset.

### After Submission

1. Overlay fades out (300ms)
2. Agents appear one by one from the left edge of the office, walking to their assigned desk (~0.5s stagger between each)
3. Sidebar populates with the first approval gate: "Équipe proposée"
4. User reviews the team proposal in the sidebar and approves/rejects

---

## Output Panel

### Artifact Cards

Horizontal scrollable strip of cards. Each card contains:
- **Title** — artifact name (e.g., "Rapport de veille concurrentielle")
- **Status badge** — colored pill: `draft` (gray), `needs_review` (orange), `approved` (green), `superseded` (strikethrough gray)
- **Version** — "v1", "v2", etc.
- **Preview** — first 3-4 lines of markdown content, truncated
- **Click action** — expands to full content in a modal or slide-up drawer, rendered as markdown

### Live Updates

When an artifact is updated during execution:
- The card gets a subtle pulse animation (CSS `@keyframes` — gentle scale + glow, 1 cycle, 600ms)
- Status badge transitions smoothly to new state
- Version number increments

---

## Approval Sidebar

### Gate Cards

Stacked vertically, one per approval checkpoint:

**Pending gate:**
- Background: `#fff8e8` (warm gold tint)
- Border: `1px solid #f2c14e`
- Content: gate title, summary text (e.g., "4 agents, 6 tâches proposées")
- Actions: "Valider" button (green fill) + "Modifier" button (gray outline)

**Approved gate:**
- Background: `#f0faf0` (light green tint)
- Checkmark icon + "Validé" text
- Non-interactive, compact

**Future gate:**
- Background: `#f5f5f5` (light gray)
- Text: gate title + "À venir"
- Grayed out, no actions

### Command Input (v2 Placeholder)

Below the gates, separated by a divider:
- Disabled text input with placeholder "Donner une instruction à l'équipe..."
- Label: "Disponible en v2" in muted text
- Component is fully wired (`command-input.tsx`), just `disabled={true}`

---

## Assets

### Source

Primary: LPC (Liberated Pixel Cup) — opengameart.org
License: CC-BY-SA 3.0 / GPL 3.0 (credit required in README)

### Required Sprites

**Agents (64x64 spritesheets):**
- 4-5 base characters with distinct hair/clothing colors
- 4 directions (down, left, right, up)
- 3 frames per direction for walk cycle
- 1 static sitting frame

**Furniture (32x32 or 64x32 tiles):**
- Office desk with monitor
- Office chair
- Coffee machine
- Potted plant (2-3 varieties)
- Task board / whiteboard
- Meeting table (large, 3x2 tiles)
- Meeting chairs

**Environment tiles (32x32):**
- Light wood parquet floor
- Cream/beige wall
- Window with warm light
- Wall clock
- Poster/frame
- Door

**State bubbles (16x16 or 24x24):**
- Magnifying glass (researching)
- Clock/hourglass (waiting for approval)
- Green checkmark (done)
- Pencil (writing)
- Speech bubble with "..." (meeting)
- Zzz (idle, optional)

### Fallback

If LPC doesn't have suitable modern-office tiles, create simple colored rectangles with CSS as placeholder. The sprite system should work with any PNG swap — no code changes needed to upgrade assets later.

---

## Migration Plan

### Files to Delete

- `src/components/office-scene.tsx`
- `src/lib/state/office.ts`
- `src/types/better-sqlite3.d.ts` (if only used for PixiJS types)

### Dependencies to Remove

- `pixi.js`
- `@pixi/react`

### Files to Rewrite

- `src/components/workspace-shell.tsx` → L-shape layout
- `src/components/mission-composer.tsx` → overlay on empty office
- `src/app/globals.css` → cream/warm theme
- `src/app/page.tsx` → simplified entry point
- `src/app/layout.tsx` → meta updates

### Files to Create

- `src/components/office/office-view.tsx`
- `src/components/office/agent-sprite.tsx`
- `src/components/office/furniture.tsx`
- `src/components/office/meeting-bubble.tsx`
- `src/components/outputs/artifact-panel.tsx`
- `src/components/outputs/artifact-card.tsx`
- `src/components/sidebar/approval-sidebar.tsx`
- `src/components/sidebar/approval-gate-card.tsx`
- `src/components/sidebar/command-input.tsx`
- `src/lib/state/office-layout.ts`
- `src/assets/sprites/` (directory with PNGs)

### Tests to Rewrite

- `tests/office-scene.test.tsx` → test new HTML renderer
- `tests/office-state.test.ts` → test grid position logic

### Tests to Add

- `tests/office-layout.test.ts` — agent state → grid position mapping
- `tests/artifact-panel.test.tsx` — card rendering, status badges, expand behavior
- `tests/approval-sidebar.test.tsx` — gate states, button actions
- `tests/workspace-shell.test.tsx` — L-shape layout renders correctly

### Tests to Keep (must still pass)

- `tests/projector.test.ts`
- `tests/artifact-provenance.test.ts`
- `tests/role-templates.test.ts`

---

## Success Criteria

1. User opens the app and sees a warm, empty pixel-art office (no PixiJS, pure HTML/CSS)
2. Mission composer overlay is clean, 3 fields, drag-drop ready
3. After submitting a brief, agents walk into the office one by one
4. Approving the team triggers task board creation; agents animate between states
5. Artifacts appear as clean cards in the bottom panel with live status updates
6. Approval gates in the sidebar are clear and actionable
7. The cream/warm theme feels welcoming, not geeky
8. All existing backend tests pass without modification
9. New renderer tests cover grid placement, state transitions, and component rendering
10. No PixiJS dependency remains in the project
